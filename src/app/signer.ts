import { canonical, fingerprint, newKeyPair, sign } from '../core/crypto';
import { AttestationItem, AttestationPayload, SignedAttestation, totals, verifyUrl } from '../core/attestation';
import { shifts } from '../core/ledger';
import { MISSION_LABEL } from '../data/sites';
import { Session, monthKey, monthlyCount } from '../core/agent';
import { getDB, now, update } from './store';

/**
 * Platform signature. In production the private key lives only on the server
 * (/api/sign, env PLATFORM_SIGNING_SEED). When the API is unreachable (local dev),
 * a per-device development key is used and the verify page says so.
 */

let serverKey: string | null | undefined;

export async function platformPublicKey(): Promise<string | null> {
  if (serverKey !== undefined) return serverKey;
  try {
    const r = await fetch('/api/platform-key');
    serverKey = r.ok ? ((await r.json()) as { publicKey: string }).publicKey : null;
  } catch {
    serverKey = null;
  }
  return serverKey;
}

function devKey() {
  let k = getDB().devPlatformKey;
  if (!k) {
    k = newKeyPair();
    const kk = k;
    update((d) => { d.devPlatformKey = kk; });
  }
  return k;
}

export async function trustedKeys(): Promise<{ keys: string[]; devKey?: string }> {
  const keys: string[] = [];
  const s = await platformPublicKey();
  if (s) keys.push(s);
  const baked = import.meta.env.VITE_PLATFORM_PUBLIC_KEY as string | undefined;
  if (baked && !keys.includes(baked)) keys.push(baked);
  const dk = getDB().devPlatformKey?.publicKey;
  return { keys, devKey: dk };
}

async function signPayload(build: (pk: string) => AttestationPayload): Promise<SignedAttestation & { dev: boolean }> {
  const pk = await platformPublicKey();
  if (pk) {
    const payload = build(fingerprint(pk));
    const r = await fetch('/api/sign', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ payload }) });
    if (r.ok) {
      const { sig, publicKey } = (await r.json()) as { sig: string; publicKey: string };
      return { payload, sig, publicKey, dev: false };
    }
  }
  const k = devKey();
  const payload = build(fingerprint(k.publicKey));
  return { payload, sig: sign(canonical(payload), k.secretKey), publicKey: k.publicKey, dev: true };
}

const hhmm = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—');

export function attestationItems(s: Session, month: string): AttestationItem[] {
  const d = getDB();
  const items: AttestationItem[] = shifts(d.ledger)
    .filter((x) => x.person === s.person && x.status === 'validated' && x.occurrence.startsWith(month))
    .map((x) => {
      const site = d.sites.find((y) => y.id === x.siteId);
      const slot = site?.slots.find((y) => y.id === x.slotId);
      const v = x.validation!;
      return {
        d: x.occurrence.slice(0, 10),
        s: site?.name ?? x.siteId,
        mi: slot ? MISSION_LABEL[slot.mission] : 'Mission',
        in: hhmm(String(v.data.in ?? x.checkIn?.data.at ?? '')),
        out: hhmm(String(v.data.out ?? x.checkOut?.data.at ?? '')),
        h: x.hours,
        c: String(v.data.coordinator ?? site?.coordinator ?? ''),
        cat: slot?.mission === 'esl_class' ? 'training' : 'volunteer',
        vh: v.hash.slice(0, 16),
        vk: v.signer ? fingerprint(v.signer) : undefined,
      } satisfies AttestationItem;
    });
  const c = monthlyCount(s, d.ledger, now());
  if (c.paid) items.push({ d: month + '-01', s: 'Declared by the person', mi: 'Paid work (self-declared, not verified by Count Me In)', in: '—', out: '—', h: c.paid, c: '—', cat: 'paid_declared' });
  if (c.training) items.push({ d: month + '-01', s: 'Declared by the person', mi: 'Training / ESL (self-declared)', in: '—', out: '—', h: c.training, c: '—', cat: 'training' });
  return items;
}

export async function issueAttestation(s: Session): Promise<{ url: string; signed: SignedAttestation; dev: boolean }> {
  const month = monthKey(now());
  const items = attestationItems(s, month);
  const signed = await signPayload((pk) => ({
    v: 1,
    id: 'CMI-' + month.replace('-', '') + '-' + s.person.slice(2, 8).toUpperCase(),
    st: 'IA',
    n: s.name ?? '',
    m: month,
    iss: now().toISOString(),
    rv: s.decision?.rulesVersion ?? 'IA',
    goal: 80,
    it: items,
    tot: totals(items),
    pk,
  }));
  return { url: verifyUrl(window.location.origin, signed), signed, dev: signed.dev };
}
