import { keyPairFromSeed } from '../src/core/crypto';

/** Platform signing key. The seed lives only in the server environment. */
export function platformKeys() {
  const seed = process.env.PLATFORM_SIGNING_SEED;
  if (!seed) return null;
  return keyPairFromSeed(seed);
}
