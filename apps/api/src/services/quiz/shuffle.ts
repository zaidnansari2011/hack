import { createHash } from "node:crypto"

/**
 * Deterministic Fisher-Yates over a SHA-256 keystream. Same `(seed, n)` →
 * same permutation, so we can shuffle choices on the way out and un-shuffle
 * on submit without persisting the mapping in the DB.
 */
export function permutation(seed: string, n: number): number[] {
  const out = Array.from({ length: n }, (_, i) => i)
  let pool: Buffer = Buffer.alloc(0)
  let cursor = 0
  let counter = 0

  const draw = (max: number): number => {
    // Reject-and-resample to avoid modulo bias on small ranges.
    while (true) {
      if (cursor + 4 > pool.length) {
        const next = createHash("sha256")
          .update(seed)
          .update(Buffer.from([counter++]))
          .digest()
        pool = Buffer.concat([pool, next])
      }
      const r = pool.readUInt32BE(cursor)
      cursor += 4
      const limit = Math.floor(0xffffffff / max) * max
      if (r < limit) return r % max
    }
  }

  for (let i = n - 1; i > 0; i--) {
    const j = draw(i + 1)
    const tmp = out[i] as number
    out[i] = out[j] as number
    out[j] = tmp
  }
  return out
}

/** Apply permutation: output[i] = input[perm[i]]. */
export function applyPermutation<T>(input: T[], perm: number[]): T[] {
  return perm.map((p) => input[p] as T)
}

/** Inverse: if shuffled index is `i`, the original index is `perm[i]`. */
export function unshuffleIndex(shuffledIndex: number, perm: number[]): number {
  return perm[shuffledIndex] ?? -1
}
