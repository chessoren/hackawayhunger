import { useEffect, useState, useSyncExternalStore } from 'react';
import { DEMO_SITES, HostSite } from '../data/sites';
import { LedgerEntry, append } from '../core/ledger';
import { KeyPair, newKeyPair } from '../core/crypto';
import { Session, Reply } from '../core/agent';
import { LlmConfig } from '../core/llm';

/**
 * Browser-side store for the hackathon build. Everything lives on this device
 * (localStorage) and syncs live between tabs (BroadcastChannel), so the person's
 * phone, the coordinator's screen and the dashboard can be opened side by side.
 * The production backend replaces this with PostgreSQL (append-only) — same core.
 */

export interface ChatMsg { id: string; from: 'person' | 'agent' | 'system'; text: string; at: string; quick?: string[]; card?: Reply['card']; image?: string }

export interface NavigatorTicket { id: string; phone: string; name?: string; reason: string; at: string; done?: boolean }

export interface DB {
  version: 3;
  ledger: LedgerEntry[];
  sites: HostSite[];
  siteKeys: Record<string, KeyPair>;
  sessions: Record<string, Session>;
  threads: Record<string, ChatMsg[]>;
  tickets: NavigatorTicket[];
  clockOffsetMs: number;
  salt: string;
  devPlatformKey?: KeyPair;
}

const KEY = 'cmi.db.v3';
const SETTINGS_KEY = 'cmi.llm';

function fresh(): DB {
  const siteKeys: Record<string, KeyPair> = {};
  for (const s of DEMO_SITES) siteKeys[s.id] = newKeyPair();
  return {
    version: 3,
    ledger: [],
    sites: DEMO_SITES.map((s) => ({ ...s, coordinatorKey: siteKeys[s.id].publicKey, createdAt: new Date().toISOString() })),
    siteKeys,
    sessions: {},
    threads: {},
    tickets: [],
    clockOffsetMs: 0,
    salt: Math.random().toString(36).slice(2),
  };
}

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const db = JSON.parse(raw) as DB;
      if (db.version === 3) return db;
    }
  } catch { /* storage unavailable */ }
  return fresh();
}

let db: DB = load();
try { if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* storage unavailable */ }
const listeners = new Set<() => void>();
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('cmi') : null;

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* quota */ }
}

channel?.addEventListener('message', () => {
  db = load();
  listeners.forEach((l) => l());
});
window.addEventListener('storage', (e) => {
  if (e.key === KEY) {
    db = load();
    listeners.forEach((l) => l());
  }
});

export function getDB(): DB {
  return db;
}

/** Mutate the DB; always produces a new top-level object so React re-renders. */
export function update(fn: (d: DB) => void) {
  const next = structuredClone(db);
  fn(next);
  db = next;
  persist();
  channel?.postMessage('changed');
  listeners.forEach((l) => l());
}

export function useDB(): DB {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => db);
}

export function resetDemo() {
  db = fresh();
  persist();
  channel?.postMessage('changed');
  listeners.forEach((l) => l());
}

// ---------------------------------------------------------------- clock

export function now(d: DB = db): Date {
  return new Date(Date.now() + d.clockOffsetMs);
}

export function useNow(intervalMs = 15000): Date {
  const d = useDB();
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now(d);
}

export function setClock(target: Date) {
  update((d) => { d.clockOffsetMs = target.getTime() - Date.now(); });
}

// ---------------------------------------------------------------- ledger

export function record(e: Omit<LedgerEntry, 'seq' | 'prevHash' | 'hash' | 'sig' | 'signer' | 'ts'> & { ts?: string }, signer?: KeyPair) {
  update((d) => {
    d.ledger.push(append(d.ledger, { ...e, ts: e.ts ?? now(d).toISOString() }, signer));
  });
}

export function bookedCount(slotId: string, occurrence: Date): number {
  const iso = occurrence.toISOString();
  return db.ledger.filter((e) => e.type === 'booking' && e.slotId === slotId && e.occurrence === iso).length
    - db.ledger.filter((e) => e.type === 'cancel' && e.slotId === slotId && e.occurrence === iso).length;
}

// ---------------------------------------------------------------- LLM settings (BYOK)

export interface StoredLlm extends LlmConfig { remember: boolean }

export function getLlmConfig(): StoredLlm | null {
  try {
    const raw = sessionStorage.getItem(SETTINGS_KEY) ?? localStorage.getItem(SETTINGS_KEY);
    return raw ? (JSON.parse(raw) as StoredLlm) : null;
  } catch {
    return null;
  }
}

export function saveLlmConfig(cfg: StoredLlm) {
  const raw = JSON.stringify(cfg);
  sessionStorage.setItem(SETTINGS_KEY, raw);
  if (cfg.remember) localStorage.setItem(SETTINGS_KEY, raw);
  else localStorage.removeItem(SETTINGS_KEY);
  listeners.forEach((l) => l());
}

export function clearLlmConfig() {
  sessionStorage.removeItem(SETTINGS_KEY);
  localStorage.removeItem(SETTINGS_KEY);
  listeners.forEach((l) => l());
}
