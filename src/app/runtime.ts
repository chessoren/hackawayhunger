import { AgentDeps, Input, Session, handle, newSession, tick, translate } from '../core/agent';
import { pseudonym } from '../core/crypto';
import { createLLM } from '../core/llm';
import { parseRules } from '../core/rules';
import rulesText from '../../rules/iowa.yaml?raw';
import { ChatMsg, bookedCount, getDB, getLlmConfig, now, record, update } from './store';
import { issueAttestation } from './signer';

export const RULES = parseRules(rulesText);
export const RULES_TEXT = rulesText;

const uid = () => Math.random().toString(36).slice(2, 10);

function push(phone: string, msg: Omit<ChatMsg, 'id' | 'at'>) {
  update((d) => {
    (d.threads[phone] ??= []).push({ ...msg, id: uid(), at: now(d).toISOString() });
  });
}

export function llmOrThrow() {
  const cfg = getLlmConfig();
  if (!cfg) throw new Error('No AI key configured');
  return createLLM({ ...cfg, browser: true });
}

function deps(): AgentDeps {
  const d = getDB();
  return {
    llm: llmOrThrow(),
    rules: RULES,
    sites: d.sites,
    ledger: d.ledger,
    now: now(d),
    record: (e) => record(e),
    bookedCount,
    issueAttestation: async (s: Session) => (await issueAttestation(s)).url,
    escalate: (s, reason) =>
      update((x) => {
        if (!x.tickets.some((t) => t.phone === s.phone && t.reason === reason && !t.done))
          x.tickets.push({ id: uid(), phone: s.phone, name: s.name, reason, at: now(x).toISOString() });
      }),
  };
}

export function sessionFor(phone: string): Session {
  const d = getDB();
  return structuredClone(d.sessions[phone] ?? newSession(phone, pseudonym(phone, d.salt), now(d)));
}

/** One person turn through the agent; the thread and session are persisted. */
export async function send(phone: string, input: Input & { imagePreview?: string }): Promise<void> {
  push(phone, { from: 'person', text: input.text ?? '', image: input.imagePreview });
  const s = sessionFor(phone);
  try {
    const replies = await handle(s, input, deps());
    update((d) => { d.sessions[phone] = s; });
    for (const r of replies) push(phone, { from: 'agent', text: r.text, quick: r.quick, card: r.card });
  } catch (e) {
    update((d) => { d.sessions[phone] = s; });
    push(phone, { from: 'system', text: `⚠️ ${(e as Error).message}` });
  }
}

/** Deliver due reminders and nudges (called when the demo clock moves). */
export async function deliverProactive(phone: string): Promise<void> {
  const d = getDB();
  const s0 = d.sessions[phone];
  if (!s0) return;
  const s = structuredClone(s0);
  const msgs = tick(s, { ledger: d.ledger, now: now(d) });
  update((x) => { x.sessions[phone] = s; });
  if (!msgs.length) return;
  let out = msgs;
  try { out = await translate(llmOrThrow(), msgs, s.lang); } catch { /* send in English */ }
  for (const m of out) push(phone, { from: 'agent', text: m });
}

/** A coordinator's validation produces a confirmation SMS to the person. */
export async function notifyValidated(person: string, hours: number, coordinator: string) {
  const d = getDB();
  const entry = Object.entries(d.sessions).find(([, s]) => s.person === person);
  if (!entry) return;
  const [phone, s] = entry;
  const { monthlyCount } = await import('../core/agent');
  const c = monthlyCount(s, d.ledger, now(d));
  const text = `${coordinator} confirmed ${hours} hours. ✅ You are at ${c.done} of 80 hours this month${c.gap ? ` — ${c.gap} to go.` : '. You made it!'}`;
  let t = text;
  try { [t] = await translate(llmOrThrow(), [text], s.lang); } catch { /* English */ }
  push(phone, { from: 'agent', text: t, card: { kind: 'gauge', done: c.done, goal: 80, daysLeft: 0, deadline: '' } });
}
