import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

// --- Config ---

const OAUTH_SECRET = process.env.OAUTH_SECRET || 'dev-secret-change-me';
const TOKEN_TTL = 5 * 60 * 1000; // 5 minutes

type OAuthProvider = 'google' | 'discord';

function getBaseUrl(): string {
  if (process.env.OAUTH_REDIRECT_BASE) return process.env.OAUTH_REDIRECT_BASE;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:5173';
}

function getRedirectUri(): string {
  return `${getBaseUrl()}/api/auth/oauth?action=callback`;
}

// --- Token signing/verification (HMAC) ---

function signToken(payload: Record<string, unknown>): string {
  const data = JSON.stringify({ ...payload, exp: Date.now() + TOKEN_TTL });
  const sig = crypto.createHmac('sha256', OAUTH_SECRET).update(data).digest('hex');
  return Buffer.from(data).toString('base64url') + '.' + sig;
}

function verifyToken(token: string): Record<string, unknown> | null {
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

interface ProviderConfig {
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string;
}

function getProviderConfig(provider: OAuthProvider): ProviderConfig | null {
  if (provider === 'google') {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;
    return {
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
      clientId, clientSecret, scopes: 'openid email profile',
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
      clientId, clientSecret, scopes: 'identify email',
    };
  }
  return null;
}

// --- Provider helpers ---

interface ProviderUser { id: string; name: string; email: string | null; }

async function exchangeCode(provider: OAuthProvider, code: string): Promise<{ accessToken: string } | null> {
  const config = getProviderConfig(provider);
  if (!config) return null;
  const body = new URLSearchParams({
    client_id: config.clientId, client_secret: config.clientSecret,
    code, grant_type: 'authorization_code', redirect_uri: getRedirectUri(),
  });
  const res = await fetch(config.tokenUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString(),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return { accessToken: data.access_token };
}

async function fetchProviderUser(provider: OAuthProvider, accessToken: string): Promise<ProviderUser | null> {
  const config = getProviderConfig(provider);
  if (!config) return null;
  const res = await fetch(config.userInfoUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return null;
  const data = await res.json();
  if (provider === 'google') {
    return { id: data.id, name: data.name || data.email?.split('@')[0] || 'User', email: data.email || null };
  }
  if (provider === 'discord') {
    return { id: data.id, name: data.global_name || data.username || 'User', email: data.email || null };
  }
  return null;
}

// --- Enrich user with OAuth status + casual stats ---

type SqlFunction = ReturnType<typeof neon>;

async function enrichUser(sql: SqlFunction, user: Record<string, unknown>) {
  const oauthRows = await sql`SELECT provider FROM oauth_accounts WHERE user_id = ${user.id as string}`;
  const hasOAuth = oauthRows.length > 0;
  const givenRows = await sql`SELECT COUNT(*) as c FROM clues WHERE user_id = ${user.id as string} AND ranked = false`;
  const solvedRows = await sql`SELECT COUNT(*) as c FROM results r JOIN clues cl ON r.clue_id = cl.id WHERE r.user_id = ${user.id as string} AND cl.ranked = false`;
  return {
    ...user,
    has_oauth: hasOAuth,
    casual_clues_given: Number(givenRows[0].c),
    casual_clues_solved: Number(solvedRows[0].c),
    session_version: Number(user.session_version) || 0,
  };
}

// === Main handler ===

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action as string;
  switch (action) {
    case 'login': return handleLogin(req, res);
    case 'url': return handleUrl(req, res);
    case 'callback': return handleCallback(req, res);
    case 'resolve': return handleResolve(req, res);
    case 'complete': return handleComplete(req, res);
    case 'accounts': return handleAccounts(req, res);
    case 'unlink': return handleUnlink(req, res);
    case 'rename': return handleRename(req, res);
    default: return res.status(400).json({ error: 'Invalid action' });
  }
}

// --- GET ?action=url ---
async function handleUrl(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const provider = req.query.provider as OAuthProvider;
  const linkUserId = req.query.linkUserId as string | undefined;
  if (provider !== 'google' && provider !== 'discord') return res.status(400).json({ error: 'Invalid provider' });
  const config = getProviderConfig(provider);
  if (!config) return res.status(500).json({ error: 'Provider not configured' });
  const state = signToken({
    provider, mode: linkUserId ? 'link' : 'login',
    ...(linkUserId ? { linkUserId } : {}), nonce: Math.random().toString(36).slice(2),
  });
  const params = new URLSearchParams({
    client_id: config.clientId, redirect_uri: getRedirectUri(),
    response_type: 'code', scope: config.scopes, state,
  });
  if (provider === 'google') params.set('access_type', 'online');
  res.json({ url: `${config.authUrl}?${params}` });
}

// --- GET ?action=callback ---
async function handleCallback(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { code, state, error: oauthError } = req.query;
  const base = getBaseUrl();
  if (oauthError) return res.redirect(`${base}/login`);
  if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
    return res.redirect(`${base}/login?oauth=error`);
  }
  const statePayload = verifyToken(state);
  if (!statePayload) return res.redirect(`${base}/login?oauth=error`);
  const provider = statePayload.provider as OAuthProvider;
  const mode = statePayload.mode as 'login' | 'link';
  const linkUserId = statePayload.linkUserId as string | undefined;
  const tokenResult = await exchangeCode(provider, code);
  if (!tokenResult) return res.redirect(`${base}/login?oauth=error`);
  const providerUser = await fetchProviderUser(provider, tokenResult.accessToken);
  if (!providerUser) return res.redirect(`${base}/login?oauth=error`);
  const sql = neon(process.env.DATABASE_URL!);

  if (mode === 'link' && linkUserId) {
    try {
      const existing = await sql`SELECT user_id FROM oauth_accounts WHERE provider = ${provider} AND provider_id = ${providerUser.id}`;
      if (existing.length > 0) return res.redirect(`${base}/profile?oauth=already_linked`);
      await sql`INSERT INTO oauth_accounts (provider, provider_id, user_id, email, provider_name, linked_at)
        VALUES (${provider}, ${providerUser.id}, ${linkUserId}, ${providerUser.email}, ${providerUser.name}, ${Date.now()})`;
      return res.redirect(`${base}/profile?oauth=linked`);
    } catch (err) {
      console.error('OAuth link error:', err);
      return res.redirect(`${base}/profile?oauth=error`);
    }
  }

  const linked = await sql`SELECT user_id FROM oauth_accounts WHERE provider = ${provider} AND provider_id = ${providerUser.id}`;
  if (linked.length > 0) {
    const token = signToken({ type: 'success', userId: linked[0].user_id as string });
    return res.redirect(`${base}/login?oauth=success&token=${encodeURIComponent(token)}`);
  }
  const token = signToken({
    type: 'register', provider, providerId: providerUser.id,
    providerName: providerUser.name, email: providerUser.email,
  });
  return res.redirect(`${base}/oauth/register?token=${encodeURIComponent(token)}`);
}

// --- POST ?action=resolve ---
async function handleResolve(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });
  const payload = verifyToken(token);
  if (!payload || payload.type !== 'success') return res.status(401).json({ error: 'Invalid or expired token' });
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`SELECT * FROM users WHERE id = ${payload.userId as string}`;
  if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
  const enriched = await enrichUser(sql, { ...rows[0], is_admin: rows[0].is_admin || false });
  res.json(enriched);
}

// --- POST ?action=complete ---
async function handleComplete(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { token, displayName } = req.body;
  if (!token || !displayName) return res.status(400).json({ error: 'Token and displayName required' });
  const payload = verifyToken(token);
  if (!payload || payload.type !== 'register') return res.status(401).json({ error: 'Invalid or expired token' });
  const trimmed = displayName.trim();
  if (trimmed.length < 2) return res.status(400).json({ error: 'name_too_short' });
  if (trimmed.length > 20) return res.status(400).json({ error: 'name_too_long' });
  if (!/^[a-zA-Zа-яА-ЯёЁ0-9 \-()[\]]+$/.test(trimmed)) return res.status(400).json({ error: 'invalid_chars' });
  const id = trimmed.toLowerCase();
  const now = Date.now();
  const sql = neon(process.env.DATABASE_URL!);
  const existing = await sql`SELECT id FROM users WHERE id = ${id}`;
  if (existing.length > 0) return res.status(409).json({ error: 'name_taken' });
  try {
    await sql`INSERT INTO users (id, display_name, created_at, preferences) VALUES (${id}, ${trimmed}, ${now}, ${JSON.stringify({})})`;
    await sql`INSERT INTO oauth_accounts (provider, provider_id, user_id, email, provider_name, linked_at)
      VALUES (${payload.provider as string}, ${payload.providerId as string}, ${id}, ${payload.email as string | null}, ${payload.providerName as string}, ${now})`;
    const newUser = { id, display_name: trimmed, created_at: now, preferences: {}, is_admin: false };
    const enriched = await enrichUser(sql, newUser);
    res.json(enriched);
  } catch (err) {
    console.error('OAuth complete error:', err);
    // Clean up user if oauth insert failed
    await sql`DELETE FROM users WHERE id = ${id}`.catch(() => {});
    res.status(500).json({ error: 'Registration failed' });
  }
}

// --- GET ?action=accounts ---
async function handleAccounts(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`SELECT provider, provider_name, email, linked_at FROM oauth_accounts WHERE user_id = ${userId}`;
  res.json(rows.map((r) => ({ provider: r.provider, providerName: r.provider_name, email: r.email, linkedAt: Number(r.linked_at) })));
}

// --- POST ?action=unlink ---
async function handleUnlink(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { userId, provider } = req.body;
  if (!userId || !provider) return res.status(400).json({ error: 'userId and provider required' });
  const sql = neon(process.env.DATABASE_URL!);
  await sql`DELETE FROM oauth_accounts WHERE user_id = ${userId} AND provider = ${provider}`;
  res.json({ ok: true });
}

// --- POST ?action=rename ---
async function handleRename(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { userId, newDisplayName } = req.body;
  if (!userId || !newDisplayName) return res.status(400).json({ error: 'userId and newDisplayName required' });
  const trimmed = newDisplayName.trim();
  if (trimmed.length < 2) return res.status(400).json({ error: 'name_too_short' });
  if (trimmed.length > 20) return res.status(400).json({ error: 'name_too_long' });
  if (!/^[a-zA-Zа-яА-ЯёЁ0-9 \-()[\]]+$/.test(trimmed)) return res.status(400).json({ error: 'invalid_chars' });
  const sql = neon(process.env.DATABASE_URL!);
  const existing = await sql`SELECT id FROM users WHERE id = ${userId}`;
  if (existing.length === 0) return res.status(404).json({ error: 'User not found' });
  const oauthCheck = await sql`SELECT provider FROM oauth_accounts WHERE user_id = ${userId}`;
  if (oauthCheck.length === 0) return res.status(403).json({ error: 'oauth_required' });
  await sql`UPDATE users SET display_name = ${trimmed} WHERE id = ${userId}`;
  res.json({ ok: true, displayName: trimmed });
}

// --- POST ?action=login (merged from auth/login.ts) ---
async function handleLogin(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { displayName, preferences, password, preferencesOnly } = req.body;
  if (!displayName) return res.status(400).json({ error: 'displayName required' });
  if (!/^[a-zA-Zа-яА-ЯёЁ0-9 \-()[\]]+$/.test(displayName.trim())) {
    return res.status(400).json({ error: 'invalid_chars' });
  }
  const sql = neon(process.env.DATABASE_URL!);
  const id = displayName.toLowerCase();
  const now = Date.now();
  const existing = await sql`SELECT * FROM users WHERE id = ${id}`;
  if (existing.length > 0) {
    const user = existing[0];
    // Check if account has OAuth linked — block nickname-only login (but allow preference updates)
    const oauthCheck = await sql`SELECT provider FROM oauth_accounts WHERE user_id = ${id}`;
    if (oauthCheck.length > 0 && !password && !preferencesOnly) {
      return res.status(401).json({ error: 'oauth_required' });
    }
    if (user.password) {
      if (!password) return res.status(401).json({ error: 'password_required' });
      if (password !== user.password) return res.status(401).json({ error: 'wrong_password' });
    }
    if (preferences) {
      await sql`UPDATE users SET preferences = ${JSON.stringify(preferences)} WHERE id = ${id}`;
    }
    if (!preferencesOnly) {
      const enriched = await enrichUser(sql, { ...user, is_admin: user.is_admin || false });
      return res.json(enriched);
    }
    const enriched = await enrichUser(sql, { ...user, is_admin: user.is_admin || false });
    return res.json(enriched);
  }
  await sql`INSERT INTO users (id, display_name, created_at, preferences, session_version)
    VALUES (${id}, ${displayName}, ${now}, ${JSON.stringify(preferences || {})}, 1)`;
  const newUser = { id, display_name: displayName, created_at: now, preferences: preferences || {}, is_admin: false, session_version: 1 };
  const enriched = await enrichUser(sql, newUser);
  res.json(enriched);
}
