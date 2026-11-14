import { config } from './config.mjs';

/**
 * Real Google OAuth 2.0 code exchange. Nothing here fabricates a profile:
 * if Google rejects the code or returns no verified email, the caller gets an
 * error it can show to the user.
 */
export class GoogleError extends Error {
  constructor(message, detail) {
    super(message);
    this.name = 'GoogleError';
    this.detail = detail || message;
  }
}

export async function exchangeGoogleCode({ code, redirectUri }) {
  const body = new URLSearchParams({
    code: String(code),
    client_id: config.google.clientId,
    client_secret: config.google.clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  let response;
  try {
    response = await fetch(config.google.tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(20000),
    });
  } catch (error) {
    throw new GoogleError('Could not reach Google to finish sign-in.', error.message);
  }

  const token = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new GoogleError(
      'Google rejected the authorization code.',
      token.error_description || token.error || `HTTP ${response.status}`
    );
  }
  if (!token.access_token) throw new GoogleError('Google did not return an access token.');

  let profileResponse;
  try {
    profileResponse = await fetch(config.google.userInfoUrl, {
      headers: { authorization: `Bearer ${token.access_token}` },
      signal: AbortSignal.timeout(20000),
    });
  } catch (error) {
    throw new GoogleError('Could not read your Google profile.', error.message);
  }

  const profile = await profileResponse.json().catch(() => ({}));
  if (!profileResponse.ok || !profile.email) {
    throw new GoogleError('Google did not return an email address for this account.', `HTTP ${profileResponse.status}`);
  }

  return {
    email: String(profile.email).trim().toLowerCase(),
    name: String(profile.name || profile.email).slice(0, 80),
    emailVerified: profile.email_verified === true || profile.email_verified === 'true',
    subject: profile.sub ? String(profile.sub) : null,
  };
}
