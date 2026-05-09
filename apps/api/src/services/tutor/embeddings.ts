/**
 * Local sentence-embedding pipeline using @xenova/transformers + ONNX runtime.
 *
 * Why local: no third-party API key, no per-request cost, no PII leaving the
 * box. Latency is ~50-150ms per query on CPU after the model is warm. The
 * model (Xenova/all-MiniLM-L6-v2, 384 dims) is downloaded once on first use
 * (~25MB) and cached under node_modules/@xenova/transformers/.cache.
 */
import { logger } from "@/config/logger"

const MODEL_NAME = "Xenova/all-MiniLM-L6-v2"

// Lazy-loaded pipeline. Held as a promise so concurrent callers all wait on
// the same instantiation instead of triggering N model downloads.
let pipelinePromise:
  | Promise<(text: string, opts: { pooling: "mean"; normalize: boolean }) => Promise<{ data: Float32Array }>>
  | null = null

async function getEmbedder() {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      logger.info({ model: MODEL_NAME }, "loading embedding model (first call)")
      // dynamic import — the package is ESM-only.
      const { pipeline, env } = await import("@xenova/transformers")
      // ONNX runtime warns about wasm threads; quiet the noise.
      env.allowLocalModels = false
      env.useBrowserCache = false
      const pipe = await pipeline("feature-extraction", MODEL_NAME, {
        quantized: true, // smaller model, near-identical quality
      })
      logger.info({ model: MODEL_NAME }, "embedding model ready")
      return pipe as unknown as (
        text: string,
        opts: { pooling: "mean"; normalize: boolean },
      ) => Promise<{ data: Float32Array }>
    })()
  }
  return pipelinePromise
}

/**
 * Returns a 384-d unit vector for `text`. Pooled (mean) and normalized so
 * cosine similarity reduces to a dot product — fast in pgvector.
 */
export async function embedText(text: string): Promise<number[]> {
  const embedder = await getEmbedder()
  const out = await embedder(text, { pooling: "mean", normalize: true })
  return Array.from(out.data)
}

/** Convenience batch embed. Sequential — the model isn't batched in JS. */
export async function embedAll(texts: string[]): Promise<number[][]> {
  const results: number[][] = []
  for (const t of texts) results.push(await embedText(t))
  return results
}

/** pgvector literal: `[0.1,0.2,...]` */
export function toPgvectorLiteral(vec: number[]): string {
  return `[${vec.map((v) => v.toFixed(6)).join(",")}]`
}
