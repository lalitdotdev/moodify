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

const MAX_RETRIES = 2;
const TIMEOUT = 50000; // 50 seconds

async function getSpotifyAccessToken(): Promise<string | null> {
  const basic = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
      }),
      signal: controller.signal, // Attach the abort controller
    });

    if (!response.ok) {
      console.error('Failed to get Spotify access token');
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error: unknown) {
    if (error instanceof Error) {
      // Now TypeScript knows 'error' is an instance of Error
      console.error('Error occurred:', error.message);
    } else {
      // Handle the case where 'error' is not an instance of Error
      console.error('An unknown error occurred');
    }
    return null;
  } finally {
    clearTimeout(timeoutId); // Cleanup timeout
  }
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

export async function POST(request: Request) {
  let retries = 0;
  let requestBody;

  try {
    requestBody = await request.json();
  } catch (error: unknown) {
    return Response.json(
      { error: 'Invalid JSON in request body', details: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }

  // Retry logic
  while (retries <= MAX_RETRIES) {
    try {
      const { song } = requestBody;

      if (!song || typeof song !== 'string') {
        return Response.json({ error: 'Invalid song input' }, { status: 400 });
      }

      // Get the GEMINI_API_KEY from the environment variable
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set');
      }

      // Initialize the Google Generative AI client
      const genAI = new GoogleGenerativeAI(apiKey);
      // Get the Gemini Pro model
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      const prompt = `Generate a curated playlist of 15 songs similar to "${song}". For each song, provide:

    1. Song title
    2. Artist name
    3. Album name (if applicable)
    4. Release year
    5. Genre(s)
    6. A brief explanation (1-2 sentences) of why this song is similar to "${song}" in terms of style, mood, or musical elements.

    Ensure a diverse selection within the similarity criteria, including both well-known and lesser-known artists. Avoid duplicate artists unless they have a particularly relevant song. Format the response as a JSON array of objects, each containing the fields: name, artist, album, year, genres (as an array), and explanation. Ensure the JSON is valid and properly formatted. Do not include any markdown formatting, code block syntax, or additional text in your response. The response should be a valid JSON array and nothing else. The playlist should be a mix of popular and lesser-known songs, with a diverse selection of genres and artists. `;

      // Generate the playlist using the Gemini Pro model
      const result = (await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), TIMEOUT)),
      ])) as GenerateContentResult;

      //   console.log('Response:', result);
      const responseText = result.response.text();
      //   console.log('Response text:', responseText);

      // Clean up the response text by removing code block syntax and extra whitespace and commas between objects in the array
      const cleanedResponse = responseText
        .replace(/```json\s*|\s*```/g, '')
        .replace(/^\s*\[|\]\s*$/g, '')
        .replace(/},\s*{/g, '},\n{')
        .trim();

      let playlist: Song[];
      try {
        // Attempt to parse the entire array
        playlist = JSON.parse(`[${cleanedResponse}]`); // Wrap the response in square brackets to parse as an array
      } catch (parseError) {
        console.error('JSON parsing failed:', parseError);
        // If parsing fails, try to parse each object separately
        const lines = cleanedResponse.split('\n'); // Split the response into lines to parse each object separately
        playlist = lines.flatMap((line) => {
          // Use flatMap to handle both valid and invalid lines in the response
          try {
            const parsedLine = JSON.parse(line);
            if (typeof parsedLine === 'object' && parsedLine !== null) {
              return [parsedLine];
            }
          } catch (lineError) {
            console.error('Error parsing line:', lineError);
            console.error(`Error parsing line: ${line}`);
            console.error(`Position of error: ${line.indexOf(line)}`);
          }
          return [];
        });
      }

      if (!playlist || !Array.isArray(playlist) || playlist.length === 0) {
        throw new Error('Failed to generate a valid playlist');
      }

      if (!Array.isArray(playlist) || playlist.length === 0) {
        throw new Error('Failed to generate a valid playlist');
      }

      //   Filter out invalid songs and ensure the playlist is an array of Song objects
      playlist = playlist
        .filter((song): song is Song => song && typeof song === 'object')
        .map((song) => ({
          name: song.name || 'Unknown',
          artist: song.artist || 'Unknown',
          album: song.album,
          year: song.year,
          genres: Array.isArray(song.genres) ? song.genres : [],
          explanation: song.explanation,
        }));

      if (playlist.length === 0) {
        throw new Error('Failed to generate a valid playlist after filtering');
      }

      // After generating and parsing the playlist, add Spotify track IDs
      const playlistWithSpotifyIds = await Promise.all(
        // Use Promise.all to await all async operations in parallel for each song in the playlist array
        playlist.map(async (song) => {
          const spotifyId = await searchSpotifyTrack(song);
          return { ...song, spotifyId };
        }),
      );

      return Response.json({ playlist: playlistWithSpotifyIds });
    } catch (error: unknown) {
      console.error(`Error in generate-playlist route (attempt ${retries + 1}):`, error);
      retries++;

      if (retries > MAX_RETRIES) {
        return Response.json(
          {
            error: 'Failed to generate playlist after multiple attempts',
            details: error instanceof Error ? error.message : String(error),
          },
          { status: 500 },
        );
      }
    }
  }

  // This should never be reached, but TypeScript requires a return statement
  return Response.json({ error: 'Unexpected error occurred' }, { status: 500 });
}
