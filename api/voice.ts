import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handle } from '../src/core/agent';
import { langByCode } from '../src/core/i18n';
import { depsFor, loadState, saveState, validTwilio, xml } from './_channel';

/**
 * Twilio Programmable Voice webhook — voice-first for people who read little.
 * Speech recognition via <Gather input="speech">, neural text-to-speech via <Say>.
 * Configure: Twilio number → Voice → "A call comes in" → POST https://<host>/api/voice
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.LLM_API_KEY || !process.env.TWILIO_AUTH_TOKEN) return res.status(503).send('Voice channel not configured (bring your own keys).');
  const params = req.body as Record<string, string>;
  const url = `https://${req.headers.host}${req.url}`;
  if (!validTwilio(url, params, req.headers['x-twilio-signature'] as string | undefined)) return res.status(403).send('Bad signature');

  const phone = params.From;
  const { session, ledger } = await loadState(phone);
  const said = params.SpeechResult ?? (session.step === 'start' ? 'Hello' : '');
  const replies = said ? await handle(session, { text: said }, depsFor(ledger)) : [];
  await saveState(phone, session, ledger);
  const lang = langByCode(session.lang).speech;
  const speech = replies.map((r) => r.text.replace(/https?:\S+/g, '')).join(' ');
  res.setHeader('content-type', 'text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Gather input="speech dtmf" language="${lang}" speechTimeout="auto" action="/api/voice" method="POST"><Say language="${lang}">${xml(speech || 'I am listening.')}</Say></Gather><Redirect method="POST">/api/voice</Redirect></Response>`);
}
