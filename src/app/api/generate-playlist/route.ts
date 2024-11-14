import { GenerateContentResult, GoogleGenerativeAI } from '@google/generative-ai';

interface Song {
  name: string;
  artist: string;
  album?: string;
  year?: string;
  genres?: string[];
  explanation?: string;
  spotifyId?: string;
}

async function getSpotifyAccessToken(): Promise<string | null> {
  const basic = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    console.error('Failed to get Spotify access token');
    return null;
  }

  const data = await response.json();
  return data.access_token;
}

async function searchSpotifyTrack(song: Song): Promise<string | undefined> {
  const accessToken = await getSpotifyAccessToken();
  if (!accessToken) {
    console.error('Failed to get Spotify access token');
    return undefined;
  }

  const query = `${song.name} ${song.artist}`;
  const encodedQuery = encodeURIComponent(query);
  const url = `https://api.spotify.com/v1/search?q=${encodedQuery}&type=track&limit=1`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.tracks.items.length > 0) {
      return data.tracks.items[0].id;
    }
  } catch (error) {
    console.error('Error searching Spotify:', error);
  }

  return undefined;
}

// First, let's define the Song type
// Define interfaces for type safety

// Interface for raw parsed data
interface RawSongData {
  name?: string | null;
  artist?: string | null;
  album?: string | null;
  year?: string | number | null;
  genres?: unknown;
  explanation?: string | null;
}

export async function POST(request: Request) {
  const MAX_RETRIES = 3;
  const TIMEOUT = 30000;
  let retries = 0;

  while (retries <= MAX_RETRIES) {
    try {
      const requestBody = await request.json();
      const { song } = requestBody;

      if (!song || typeof song !== 'string') {
        return Response.json({ error: 'Invalid song input' }, { status: 400 });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      const prompt = `Generate a curated playlist of 10 songs similar to "${song}". Return only a JSON array of objects with the following structure, and no additional text or formatting:
        {
          "name": "Song Name",
          "artist": "Artist Name",
          "album": "Album Name",
          "year": "1234",
          "genres": ["Genre1", "Genre2"],
          "explanation": "Brief explanation"
        }`;

      const result = (await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), TIMEOUT)),
      ])) as GenerateContentResult;

      const responseText = result.response.text();

      let cleanedResponse = responseText
        .replace(/```json|\```/g, '')
        .replace(/^\s*|\s*$/g, '')
        .trim();

      if (!cleanedResponse.startsWith('[')) {
        cleanedResponse = '[' + cleanedResponse;
      }
      if (!cleanedResponse.endsWith(']')) {
        cleanedResponse = cleanedResponse + ']';
      }

      let playlist: Song[];
      try {
        const parsedData = JSON.parse(cleanedResponse) as RawSongData[];

        if (!Array.isArray(parsedData)) {
          throw new Error('Response is not an array');
        }

        // Map the parsed data to match the Song type with proper type checking
        playlist = parsedData.map((item: RawSongData) => ({
          name: String(item.name || ''),
          artist: String(item.artist || ''),
          album: String(item.album || ''),
          year: String(item.year || ''),
          genres: Array.isArray(item.genres) ? item.genres.map((genre) => String(genre || '')) : [],
          explanation: String(item.explanation || ''),
        }));
      } catch (error) {
        console.error(`Attempt ${retries + 1}: JSON parsing error:`, error);
        throw new Error('Failed to parse playlist data');
      }

      // Add Spotify track IDs
      const playlistWithSpotifyIds = await Promise.all(
        playlist.map(async (song) => {
          try {
            const spotifyId = await searchSpotifyTrack(song);
            return { ...song, spotifyId };
          } catch (error) {
            console.error(`Failed to fetch Spotify ID for ${song.name}:`, error);
            return { ...song, spotifyId: null };
          }
        }),
      );

      return Response.json(
        {
          playlist: playlistWithSpotifyIds,
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-store',
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error) {
      console.error(`Attempt ${retries + 1} failed:`, error);

      if (retries >= MAX_RETRIES) {
        return Response.json(
          {
            error: 'Failed to generate playlist after multiple attempts',
            details: error instanceof Error ? error.message : String(error),
          },
          {
            status: 500,
            headers: {
              'Cache-Control': 'no-store',
              'Content-Type': 'application/json',
            },
          },
        );
      }

      const delay = Math.min(1000 * Math.pow(2, retries), 10000);
      await new Promise((resolve) => setTimeout(resolve, delay));

      retries++;
    }
  }

  return Response.json(
    {
      error: 'Unexpected error occurred',
    },
    {
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
    },
  );
}
