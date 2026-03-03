import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { verifyToken, signToken, exchangeCode, fetchProviderUser, getBaseUrl } from './lib';
import type { OAuthProvider } from './lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { code, state, error: oauthError } = req.query;
  const base = getBaseUrl();

  // User cancelled consent
  if (oauthError) {
    return res.redirect(`${base}/login`);
  }

  if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
    return res.redirect(`${base}/login?oauth=error`);
  }

  // Verify state
  const statePayload = verifyToken(state);
  if (!statePayload) {
    return res.redirect(`${base}/login?oauth=error`);
  }

  const provider = statePayload.provider as OAuthProvider;
  const mode = statePayload.mode as 'login' | 'link';
  const linkUserId = statePayload.linkUserId as string | undefined;

  // Exchange code for access token
  const tokenResult = await exchangeCode(provider, code);
  if (!tokenResult) {
    return res.redirect(`${base}/login?oauth=error`);
  }

  // Fetch user info from provider
  const providerUser = await fetchProviderUser(provider, tokenResult.accessToken);
  if (!providerUser) {
    return res.redirect(`${base}/login?oauth=error`);
  }

  const sql = neon(process.env.DATABASE_URL!);

  // --- LINK MODE ---
  if (mode === 'link' && linkUserId) {
    // Check if this provider account is already linked to someone
    const existing = await sql`SELECT user_id FROM oauth_accounts WHERE provider = ${provider} AND provider_id = ${providerUser.id}`;
    if (existing.length > 0) {
      // Already linked (maybe to same user, maybe different)
      return res.redirect(`${base}/profile?oauth=already_linked`);
    }

    await sql`INSERT INTO oauth_accounts (provider, provider_id, user_id, email, provider_name, linked_at)
      VALUES (${provider}, ${providerUser.id}, ${linkUserId}, ${providerUser.email}, ${providerUser.name}, ${Date.now()})`;

    return res.redirect(`${base}/profile?oauth=linked`);
  }

  // --- LOGIN MODE ---
  // Check if this provider account is already linked
  const linked = await sql`SELECT user_id FROM oauth_accounts WHERE provider = ${provider} AND provider_id = ${providerUser.id}`;

  if (linked.length > 0) {
    // Existing user — sign a success token
    const userId = linked[0].user_id as string;
    const token = signToken({ type: 'success', userId });
    return res.redirect(`${base}/?oauth=success&token=${encodeURIComponent(token)}`);
  }

  // New user — sign a register token with provider info
  const token = signToken({
    type: 'register',
    provider,
    providerId: providerUser.id,
    providerName: providerUser.name,
    email: providerUser.email,
  });
  return res.redirect(`${base}/?oauth=register&token=${encodeURIComponent(token)}`);
}
