import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getProviderConfig, getRedirectUri, signToken } from './lib';
import type { OAuthProvider } from './lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  // Google needs prompt=consent for refresh behavior
  if (provider === 'google') {
    params.set('access_type', 'online');
  }

  const url = `${config.authUrl}?${params}`;
  res.json({ url });
}
