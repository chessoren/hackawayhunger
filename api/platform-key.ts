import type { VercelRequest, VercelResponse } from '@vercel/node';
import { platformKeys } from './_platform';
import { fingerprint } from '../src/core/crypto';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const k = platformKeys();
  if (!k) return res.status(503).json({ error: 'Platform key not configured' });
  res.setHeader('cache-control', 'public, max-age=300');
  return res.json({ publicKey: k.publicKey, fingerprint: fingerprint(k.publicKey) });
}
