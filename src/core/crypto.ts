import nacl from 'tweetnacl';

const enc = new TextEncoder();
const dec = new TextDecoder();

export function toB64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
export function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
export const toB64Url = (bytes: Uint8Array) => toB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const fromB64Url = (s: string) => fromB64(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));

export const utf8 = (s: string) => enc.encode(s);
export const fromUtf8 = (b: Uint8Array) => dec.decode(b);

/** Deterministic JSON (sorted keys) so signatures are reproducible. */
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).filter((k) => obj[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(',')}}`;
}

/** SHA-512 truncated to 256 bits, hex. Synchronous (tweetnacl) so it runs anywhere. */
export function hash(data: string): string {
  const h = nacl.hash(utf8(data)).slice(0, 32);
  return Array.from(h, (b) => b.toString(16).padStart(2, '0')).join('');
}

export interface KeyPair { publicKey: string; secretKey: string }

export function newKeyPair(): KeyPair {
  const kp = nacl.sign.keyPair();
  return { publicKey: toB64(kp.publicKey), secretKey: toB64(kp.secretKey) };
}

export function keyPairFromSeed(seedB64: string): KeyPair {
  const kp = nacl.sign.keyPair.fromSeed(fromB64(seedB64).slice(0, 32));
  return { publicKey: toB64(kp.publicKey), secretKey: toB64(kp.secretKey) };
}

export function sign(message: string, secretKeyB64: string): string {
  return toB64(nacl.sign.detached(utf8(message), fromB64(secretKeyB64)));
}

export function verify(message: string, signatureB64: string, publicKeyB64: string): boolean {
  try {
    return nacl.sign.detached.verify(utf8(message), fromB64(signatureB64), fromB64(publicKeyB64));
  } catch {
    return false;
  }
}

/** Short human-checkable fingerprint of a public key. */
export function fingerprint(publicKeyB64: string): string {
  return hash(publicKeyB64).slice(0, 16).toUpperCase().replace(/(.{4})(?=.)/g, '$1-');
}

/** Pseudonymous person id: never store phone numbers in the ledger. */
export function pseudonym(phone: string, salt: string): string {
  return 'p_' + hash(`${salt}:${phone.replace(/\D/g, '')}`).slice(0, 20);
}
