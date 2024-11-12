import { NextResponse } from 'next/server';

//  server-side callback for Spotify's OAuth 2.0 flow. It retrieves the authorization code from the URL, exchanges it for an access token, and then redirects the user to a frontend route with the token data. The callback is a necessary part of OAuth flows because it finalizes the authentication by exchanging a short-lived authorization code for an access token that can be used to make authorized API requests.

export async function GET(request: Request) {
  // When Spotify redirects the user back to your app, it appends an authorization code as a query parameter (?code=...) to the callback URL.
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code'); // code is critical for the next step, where it will be exchanged for an access token.

  if (!code) {
    return NextResponse.redirect(new URL('/error?message=No code provided', request.url));
  }

  try {
    // Exchanges the authorization code (from Spotify) for an access token by making a POST request to Spotify's /api/token endpoint.
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get access token');
    }

    const tokenData = await tokenResponse.json();

    // Redirect to the SpotifyCallback component with the token data
    const callbackUrl = new URL('/spotify/callback', request.url);
    callbackUrl.search = new URLSearchParams(tokenData).toString();
    return NextResponse.redirect(callbackUrl);
  } catch (error) {
    console.error('Error in Spotify callback:', error);
    return NextResponse.redirect(new URL('/error?message=Authentication failed', request.url));
  }
}
