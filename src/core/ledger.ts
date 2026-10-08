import { canonical, hash, sign, verify } from './crypto';

/**
 * The signed hours ledger — the single source of truth.
 * Append-only: entries are never edited or deleted. A correction is a new entry.
 * Each entry carries the hash of the previous one (tamper-evident chain) and,
 * for validations, the coordinator's Ed25519 signature.
 */

export type EntryType = 'booking' | 'check_in' | 'check_out' | 'validation' | 'no_show' | 'cancel' | 'consent' | 'erasure';

export interface LedgerEntry {
  seq: number;
  ts: string;
  type: EntryType;
  person: string; // pseudonymous id
  siteId?: string;
  slotId?: string;
  occurrence?: string; // ISO date of the shift
  data: Record<string, unknown>;
  prevHash: string;
  hash: string;
  signer?: string; // public key (base64)
  sig?: string;
}

export const GENESIS = '0'.repeat(64);

type Unsigned = Omit<LedgerEntry, 'hash' | 'sig' | 'signer' | 'seq' | 'prevHash'>;

export function entryBody(e: Omit<LedgerEntry, 'hash' | 'sig'>): string {
  const { seq, ts, type, person, siteId, slotId, occurrence, data, prevHash, signer } = e;
  return canonical({ seq, ts, type, person, siteId, slotId, occurrence, data, prevHash, signer });
}

export function append(chain: LedgerEntry[], entry: Unsigned, signerKeys?: { publicKey: string; secretKey: string }): LedgerEntry {
  const prev = chain[chain.length - 1];
  const draft: Omit<LedgerEntry, 'hash' | 'sig'> = {
    ...entry,
    seq: prev ? prev.seq + 1 : 0,
    prevHash: prev ? prev.hash : GENESIS,
    signer: signerKeys?.publicKey,
  };
  const body = entryBody(draft);
  const full: LedgerEntry = { ...draft, hash: hash(body) };
  if (signerKeys) full.sig = sign(full.hash, signerKeys.secretKey);
  return full;
}

export interface ChainCheck { ok: boolean; brokenAt?: number; reason?: string }

/** Re-verifies every link and every signature. */
export function verifyChain(chain: LedgerEntry[]): ChainCheck {
  let prevHash = GENESIS;
  for (const e of chain) {
    if (e.prevHash !== prevHash) return { ok: false, brokenAt: e.seq, reason: 'broken link' };
    const { hash: h, sig, ...rest } = e;
    void sig;
    if (hash(entryBody(rest)) !== h) return { ok: false, brokenAt: e.seq, reason: 'entry modified' };
    if (e.signer && (!e.sig || !verify(h, e.sig, e.signer))) return { ok: false, brokenAt: e.seq, reason: 'bad signature' };
    prevHash = h;
  }
  return { ok: true };
}

export interface Shift {
  person: string;
  siteId: string;
  slotId: string;
  occurrence: string;
  booked?: LedgerEntry;
  checkIn?: LedgerEntry;
  checkOut?: LedgerEntry;
  validation?: LedgerEntry;
  noShow?: LedgerEntry;
  cancelled?: LedgerEntry;
  status: 'booked' | 'arrived' | 'left' | 'validated' | 'no_show' | 'cancelled';
  hours: number;
}

const key = (e: { person: string; slotId?: string; occurrence?: string }) => `${e.person}|${e.slotId}|${e.occurrence}`;

/** Fold the ledger into shifts (bookings with their lifecycle). */
export function shifts(chain: LedgerEntry[]): Shift[] {
  const map = new Map<string, Shift>();
  const erased = new Set(chain.filter((e) => e.type === 'erasure').map((e) => e.person));
  for (const e of chain) {
    if (!e.slotId || !e.occurrence || !e.siteId) continue;
    const k = key(e);
    let s = map.get(k);
    if (!s) {
      s = { person: e.person, siteId: e.siteId, slotId: e.slotId, occurrence: e.occurrence, status: 'booked', hours: 0 };
      map.set(k, s);
    }
    switch (e.type) {
      case 'booking': s.booked = e; s.status = 'booked'; break;
      case 'check_in': s.checkIn = e; s.status = 'arrived'; break;
      case 'check_out': s.checkOut = e; s.status = 'left'; break;
      case 'validation': s.validation = e; s.status = 'validated'; s.hours = Number(e.data.hours) || 0; break;
      case 'no_show': s.noShow = e; if (s.status === 'booked') s.status = 'no_show'; break;
      case 'cancel': s.cancelled = e; if (s.status === 'booked') s.status = 'cancelled'; break;
    }
  }
  return [...map.values()].filter((s) => !erased.has(s.person));
}

/** Only coordinator-validated hours count. Self-reported hours never do. */
export function validatedHours(chain: LedgerEntry[], person: string, month?: string): number {
  return shifts(chain)
    .filter((s) => s.person === person && s.status === 'validated' && (!month || s.occurrence.startsWith(month)))
    .reduce((sum, s) => sum + s.hours, 0);
}

export function roundQuarter(h: number): number {
  return Math.round(h * 4) / 4;
}

export function hoursBetween(startIso: string, endIso: string): number {
  return roundQuarter((new Date(endIso).getTime() - new Date(startIso).getTime()) / 3600000);
}
