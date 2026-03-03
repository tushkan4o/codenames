import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import {
  signToken, verifyToken,
  getProviderConfig, getRedirectUri, getBaseUrl,
  exchangeCode, fetchProviderUser,
} from './lib';
import type { OAuthProvider } from './lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action as string;

  switch (action) {
    case 'url': return handleUrl(req, res);
    case 'callback': return handleCallback(req, res);
    case 'resolve': return handleResolve(req, res);
    case 'complete': return handleComplete(req, res);
    case 'accounts': return handleAccounts(req, res);
    case 'unlink': return handleUnlink(req, res);
    default: return res.status(400).json({ error: 'Invalid action' });
  }
}

// --- GET ?action=url&provider=google|discord&linkUserId=... ---
async function handleUrl(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const provider = req.query.provider as OAuthProvider;
  const linkUserId = req.query.linkUserId as string | undefined;

  if (provider !== 'google' && provider !== 'discord') {
    return res.status(400).json({ error: 'Invalid provider' });
  }

  const config = getProviderConfig(provider);
  if (!config) return res.status(500).json({ error: 'Provider not configured' });

  const state = signToken({
    provider,
    mode: linkUserId ? 'link' : 'login',
    ...(linkUserId ? { linkUserId } : {}),
    nonce: Math.random().toString(36).slice(2),
  });

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: config.scopes,
    state,
  });

  if (provider === 'google') {
    params.set('access_type', 'online');
  }

  const url = `${config.authUrl}?${params}`;
  res.json({ url });
}

// --- GET ?action=callback&code=...&state=... ---
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

  // Link mode
  if (mode === 'link' && linkUserId) {
    const existing = await sql`SELECT user_id FROM oauth_accounts WHERE provider = ${provider} AND provider_id = ${providerUser.id}`;
    if (existing.length > 0) return res.redirect(`${base}/profile?oauth=already_linked`);

    await sql`INSERT INTO oauth_accounts (provider, provider_id, user_id, email, provider_name, linked_at)
      VALUES (${provider}, ${providerUser.id}, ${linkUserId}, ${providerUser.email}, ${providerUser.name}, ${Date.now()})`;

    return res.redirect(`${base}/profile?oauth=linked`);
  }

  // Login mode
  const linked = await sql`SELECT user_id FROM oauth_accounts WHERE provider = ${provider} AND provider_id = ${providerUser.id}`;

  if (linked.length > 0) {
    const userId = linked[0].user_id as string;
    const token = signToken({ type: 'success', userId });
    return res.redirect(`${base}/?oauth=success&token=${encodeURIComponent(token)}`);
  }

  const token = signToken({
    type: 'register',
    provider,
    providerId: providerUser.id,
    providerName: providerUser.name,
    email: providerUser.email,
  });
  return res.redirect(`${base}/?oauth=register&token=${encodeURIComponent(token)}`);
}

// --- POST ?action=resolve { token } ---
async function handleResolve(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const payload = verifyToken(token);
  if (!payload || payload.type !== 'success') {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const userId = payload.userId as string;
  const sql = neon(process.env.DATABASE_URL!);

  const rows = await sql`SELECT * FROM users WHERE id = ${userId}`;
  if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

  const user = rows[0];
  res.json({ ...user, is_admin: user.is_admin || false });
}

// --- POST ?action=complete { token, displayName } ---
async function handleComplete(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token, displayName } = req.body;
  if (!token || !displayName) return res.status(400).json({ error: 'Token and displayName required' });

  const payload = verifyToken(token);
  if (!payload || payload.type !== 'register') {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const trimmed = displayName.trim();
  if (trimmed.length < 2) return res.status(400).json({ error: 'name_too_short' });
  if (trimmed.length > 20) return res.status(400).json({ error: 'name_too_long' });
  if (!/^[a-zA-Zа-яА-ЯёЁ0-9 \-()[\]]+$/.test(trimmed)) {
    return res.status(400).json({ error: 'invalid_chars' });
  }

  const id = trimmed.toLowerCase();
  const now = Date.now();
  const sql = neon(process.env.DATABASE_URL!);

  const existing = await sql`SELECT id FROM users WHERE id = ${id}`;
  if (existing.length > 0) return res.status(409).json({ error: 'name_taken' });

  await sql`INSERT INTO users (id, display_name, created_at, preferences)
    VALUES (${id}, ${trimmed}, ${now}, ${JSON.stringify({})})`;

  const provider = payload.provider as string;
  const providerId = payload.providerId as string;
  const providerName = payload.providerName as string;
  const email = payload.email as string | null;

  await sql`INSERT INTO oauth_accounts (provider, provider_id, user_id, email, provider_name, linked_at)
    VALUES (${provider}, ${providerId}, ${id}, ${email}, ${providerName}, ${now})`;

  res.json({ id, display_name: trimmed, created_at: now, preferences: {}, is_admin: false });
}

// --- GET ?action=accounts&userId=... ---
async function handleAccounts(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`SELECT provider, provider_name, email, linked_at FROM oauth_accounts WHERE user_id = ${userId}`;

  res.json(rows.map((r) => ({
    provider: r.provider,
    providerName: r.provider_name,
    email: r.email,
    linkedAt: Number(r.linked_at),
  })));
}

// --- POST ?action=unlink { userId, provider } ---
async function handleUnlink(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, provider } = req.body;
  if (!userId || !provider) return res.status(400).json({ error: 'userId and provider required' });

  const sql = neon(process.env.DATABASE_URL!);
  await sql`DELETE FROM oauth_accounts WHERE user_id = ${userId} AND provider = ${provider}`;

  res.json({ ok: true });
}
