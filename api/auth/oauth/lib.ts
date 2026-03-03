import crypto from 'crypto';

const OAUTH_SECRET = process.env.OAUTH_SECRET || 'dev-secret-change-me';
const TOKEN_TTL = 5 * 60 * 1000; // 5 minutes

export function getBaseUrl(): string {
  if (process.env.OAUTH_REDIRECT_BASE) return process.env.OAUTH_REDIRECT_BASE;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:5173';
}

export function getRedirectUri(): string {
  return `${getBaseUrl()}/api/auth/oauth/callback`;
}

// --- Token signing/verification (HMAC, no JWT library needed) ---

export function signToken(payload: Record<string, unknown>): string {
  const data = JSON.stringify({ ...payload, exp: Date.now() + TOKEN_TTL });
  const sig = crypto.createHmac('sha256', OAUTH_SECRET).update(data).digest('hex');
  return Buffer.from(data).toString('base64url') + '.' + sig;
}

export function verifyToken(token: string): Record<string, unknown> | null {
  const [b64, sig] = token.split('.');
  if (!b64 || !sig) return null;
  const data = Buffer.from(b64, 'base64url').toString();
  const expected = crypto.createHmac('sha256', OAUTH_SECRET).update(data).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const payload = JSON.parse(data);
  if (payload.exp && payload.exp < Date.now()) return null;
  return payload;
}

// --- Provider configurations ---

export type OAuthProvider = 'google' | 'discord';

interface ProviderConfig {
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string;
}

export function getProviderConfig(provider: OAuthProvider): ProviderConfig | null {
  if (provider === 'google') {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;
    return {
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
      clientId,
      clientSecret,
      scopes: 'openid email profile',
    };
  }
  if (provider === 'discord') {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;
    return {
      authUrl: 'https://discord.com/api/oauth2/authorize',
      tokenUrl: 'https://discord.com/api/oauth2/token',
      userInfoUrl: 'https://discord.com/api/users/@me',
      clientId,
      clientSecret,
      scopes: 'identify email',
    };
  }
  return null;
}

// --- Exchange code for access token ---

export async function exchangeCode(provider: OAuthProvider, code: string): Promise<{ accessToken: string } | null> {
  const config = getProviderConfig(provider);
  if (!config) return null;

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: getRedirectUri(),
  });

  const res = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return { accessToken: data.access_token };
}

// --- Fetch user info from provider ---

export interface ProviderUser {
  id: string;
  name: string;
  email: string | null;
}

export async function fetchProviderUser(provider: OAuthProvider, accessToken: string): Promise<ProviderUser | null> {
  const config = getProviderConfig(provider);
  if (!config) return null;

  const res = await fetch(config.userInfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return null;
  const data = await res.json();

  if (provider === 'google') {
    return { id: data.id, name: data.name || data.email?.split('@')[0] || 'User', email: data.email || null };
  }
  if (provider === 'discord') {
    const name = data.global_name || data.username || 'User';
    return { id: data.id, name, email: data.email || null };
  }
  return null;
}
