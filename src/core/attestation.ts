import { canonical, fingerprint, fromB64Url, fromUtf8, toB64Url, utf8, verify } from './crypto';

/** One verified activity line on the monthly attestation. */
export interface AttestationItem {
  d: string; // date YYYY-MM-DD
  s: string; // site name
  mi: string; // mission label
  in: string; // HH:MM arrival
  out: string; // HH:MM departure
  h: number; // hours
  c: string; // coordinator who validated
  cat: 'volunteer' | 'training' | 'paid_declared';
  /** Ledger entry hash of the validation + coordinator key fingerprint (audit trail). */
  vh?: string;
  vk?: string;
}

export interface AttestationPayload {
  v: 1;
  id: string;
  st: string; // state
  n: string; // first name only (data minimization)
  m: string; // month YYYY-MM
  iss: string; // issued ISO
  rv: string; // rules version used
  goal: number;
  it: AttestationItem[];
  tot: { volunteer: number; training: number; paid_declared: number; all: number };
  /** Platform key fingerprint (who signed). */
  pk: string;
}

export interface SignedAttestation { payload: AttestationPayload; sig: string; publicKey: string }

export function totals(items: AttestationItem[]): AttestationPayload['tot'] {
  const t = { volunteer: 0, training: 0, paid_declared: 0, all: 0 };
  for (const i of items) {
    t[i.cat] += i.h;
    t.all += i.h;
  }
  return t;
}

export function encodeAttestation(a: SignedAttestation): string {
  return `${toB64Url(utf8(canonical(a.payload)))}.${toB64Url(utf8(a.sig))}`;
}

export function decodeAttestation(fragment: string): { payload: AttestationPayload; sig: string; raw: string } | null {
  try {
    const [p, s] = fragment.replace(/^#/, '').split('.');
    const raw = fromUtf8(fromB64Url(p));
    return { payload: JSON.parse(raw), sig: fromUtf8(fromB64Url(s)), raw };
  } catch {
    return null;
  }
}

export type VerifyResult =
  | { status: 'authentic'; payload: AttestationPayload; signer: string }
  | { status: 'tampered'; payload: AttestationPayload; reason: string }
  | { status: 'untrusted_key'; payload: AttestationPayload; signer: string }
  | { status: 'unreadable' };

/**
 * Verify an attestation link. `trustedKeys` are the platform public keys the
 * verifier trusts (published by the platform). Any change to any character of
 * the document breaks the signature.
 */
export function verifyAttestation(fragment: string, trustedKeys: string[]): VerifyResult {
  const decoded = decodeAttestation(fragment);
  if (!decoded) return { status: 'unreadable' };
  const { payload, sig } = decoded;
  const body = canonical(payload);
  const signer = trustedKeys.find((k) => verify(body, sig, k));
  if (signer) {
    if (fingerprint(signer) !== payload.pk) return { status: 'tampered', payload, reason: 'Signer fingerprint mismatch' };
    const recomputed = totals(payload.it);
    if (recomputed.all !== payload.tot.all) return { status: 'tampered', payload, reason: 'Totals do not add up' };
    return { status: 'authentic', payload, signer };
  }
  return { status: 'tampered', payload, reason: 'Signature does not match the document. It was modified after signing, or not signed by Count Me In.' };
}

export function verifyUrl(origin: string, a: SignedAttestation): string {
  return `${origin}/verify#${encodeAttestation(a)}`;
}
