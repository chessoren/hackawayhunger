import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handle } from '../src/core/agent';
import { depsFor, loadState, saveState, validTwilio, xml } from './_channel';

/**
 * Twilio Programmable Messaging webhook (SMS / MMS / WhatsApp).
 * Configure: Twilio number → Messaging → "A message comes in" → POST https://<host>/api/sms
 * Requires TWILIO_AUTH_TOKEN, TWILIO_ACCOUNT_SID, LLM_PROVIDER, LLM_API_KEY.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.LLM_API_KEY || !process.env.TWILIO_AUTH_TOKEN) return res.status(503).send('SMS channel not configured (bring your own keys).');
  const params = req.body as Record<string, string>;
  const url = `https://${req.headers.host}${req.url}`;
  if (!validTwilio(url, params, req.headers['x-twilio-signature'] as string | undefined)) return res.status(403).send('Bad signature');

  const phone = params.From;
  const { session, ledger } = await loadState(phone);
  let image: { base64: string; mediaType: string } | undefined;
  if (Number(params.NumMedia) > 0 && params.MediaUrl0) {
    const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const r = await fetch(params.MediaUrl0, { headers: { Authorization: `Basic ${auth}` } });
    image = { base64: Buffer.from(await r.arrayBuffer()).toString('base64'), mediaType: params.MediaContentType0 ?? 'image/jpeg' };
  }
  const replies = await handle(session, { text: params.Body ?? '', image }, depsFor(ledger));
  await saveState(phone, session, ledger);
  res.setHeader('content-type', 'text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?><Response>${replies.map((r) => `<Message>${xml(r.text)}</Message>`).join('')}</Response>`);
}
