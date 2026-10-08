import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import crypto from 'node:crypto';
import { AgentDeps, Session, newSession } from '../src/core/agent';
import { LedgerEntry, append } from '../src/core/ledger';
import { createLLM, Provider } from '../src/core/llm';
import { parseRules } from '../src/core/rules';
import { pseudonym } from '../src/core/crypto';
import { DEMO_SITES } from '../src/data/sites';

/**
 * Shared state for the SMS and voice channels. Uses Upstash Redis (REST) when
 * configured, otherwise process memory (fine for a single-instance demo).
 */

const mem = new Map<string, string>();
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function kvGet(key: string): Promise<string | null> {
  if (!REDIS_URL) return mem.get(key) ?? null;
  const r = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${REDIS_TOKEN}` } });
  return ((await r.json()) as { result: string | null }).result;
}
async function kvSet(key: string, value: string): Promise<void> {
  if (!REDIS_URL) { mem.set(key, value); return; }
  await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}`, { method: 'POST', headers: { Authorization: `Bearer ${REDIS_TOKEN}` }, body: value });
}

export const RULES = parseRules(readFileSync(join(process.cwd(), 'rules/iowa.yaml'), 'utf8'));
const SALT = process.env.PSEUDONYM_SALT ?? 'count-me-in';

export async function loadState(phone: string): Promise<{ session: Session; ledger: LedgerEntry[] }> {
  const s = await kvGet(`session:${phone}`);
  const l = await kvGet('ledger');
  return {
    session: s ? (JSON.parse(s) as Session) : newSession(phone, pseudonym(phone, SALT), new Date()),
    ledger: l ? (JSON.parse(l) as LedgerEntry[]) : [],
  };
}

export async function saveState(phone: string, session: Session, ledger: LedgerEntry[]) {
  await kvSet(`session:${phone}`, JSON.stringify(session));
  await kvSet('ledger', JSON.stringify(ledger));
}

export function depsFor(ledger: LedgerEntry[]): AgentDeps {
  const provider = (process.env.LLM_PROVIDER ?? 'anthropic') as Provider;
  return {
    llm: createLLM({ provider, apiKey: process.env.LLM_API_KEY ?? '', model: process.env.LLM_MODEL }),
    rules: RULES,
    sites: DEMO_SITES,
    ledger,
    now: new Date(),
    record: (e) => { ledger.push(append(ledger, { ...e, ts: new Date().toISOString() })); },
    bookedCount: (slotId, occ) => ledger.filter((e) => e.type === 'booking' && e.slotId === slotId && e.occurrence === occ.toISOString()).length,
  };
}

/** Twilio request signature check (HMAC-SHA1 over URL + sorted POST params). */
export function validTwilio(url: string, params: Record<string, string>, signature: string | undefined): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return false;
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join('');
  const expected = crypto.createHmac('sha1', token).update(Buffer.from(data, 'utf-8')).digest('base64');
  return !!signature && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature.padEnd(expected.length).slice(0, expected.length)));
}

export const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
