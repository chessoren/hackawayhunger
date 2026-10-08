import type { VercelRequest, VercelResponse } from '@vercel/node';
import { platformKeys } from './_platform';
import { canonical, fingerprint, sign } from '../src/core/crypto';
import { AttestationPayload, totals } from '../src/core/attestation';

/**
 * Signs a monthly attestation with the platform key.
 * Hackathon build: the ledger lives on the client, so the server checks the
 * payload's structure and arithmetic. Production: the server builds the
 * attestation itself from its own append-only ledger and signs only that.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const k = platformKeys();
  if (!k) return res.status(503).json({ error: 'Platform key not configured' });
  const p = (req.body?.payload ?? null) as AttestationPayload | null;
  if (!p || p.v !== 1 || !Array.isArray(p.it) || p.it.length > 200 || typeof p.n !== 'string' || !/^\d{4}-\d{2}$/.test(p.m)) {
    return res.status(400).json({ error: 'Invalid attestation payload' });
  }
  if (p.pk !== fingerprint(k.publicKey)) return res.status(400).json({ error: 'Wrong platform key fingerprint' });
  const t = totals(p.it);
  if (t.all !== p.tot.all || t.volunteer !== p.tot.volunteer) return res.status(400).json({ error: 'Totals do not add up' });
  if (p.it.some((i) => i.h < 0 || i.h > (i.cat === 'volunteer' ? 12 : 200))) return res.status(400).json({ error: 'Implausible hours' });
  return res.json({ sig: sign(canonical(p), k.secretKey), publicKey: k.publicKey });
}
