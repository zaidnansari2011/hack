import { Prisma } from "@prisma/client"

import { prisma } from "@/db/prisma"
import { logger } from "@/config/logger"
import { embedText, toPgvectorLiteral } from "./embeddings"

export type RetrievedChunk = {
  id: string
  source: string
  content: string
  pageNumber: number | null
  score: number
}

/**
 * All chunks for a single syllabus module, ordered by chunkIndex. Used by
 * lesson mode: the tutor needs the full set of paragraphs for one topic, not
 * a top-K filtered slice.
 */
export async function retrieveModuleChunks(args: {
  curriculumId: string
  moduleSlug: string
}): Promise<RetrievedChunk[]> {
  // chunks have source like `<curric-id-prefix>#<topic-slug>` — match on the
  // hash suffix so we don't need to know the prefix.
  const rows = await prisma.curriculumChunk.findMany({
    where: {
      curriculumId: args.curriculumId,
      source: { endsWith: `#${args.moduleSlug}` },
    },
    orderBy: { chunkIndex: "asc" },
  })
  return rows.map((r) => ({
    id: r.id,
    source: r.source,
    content: r.content,
    pageNumber: r.pageNumber,
    score: 1,
  }))
}

/**
 * Hybrid retrieval over CurriculumChunk:
 *   1. Semantic search via pgvector cosine similarity against a query
 *      embedding (Xenova/all-MiniLM-L6-v2, 384 dims, local ONNX runtime)
 *   2. Falls back to FTS (ts_rank) if the query embedding fails for any
 *      reason — the model is loaded lazily and the first call can be slow.
 *   3. Falls back to chunkIndex order for very short queries.
 */
export async function retrieveChunks(args: {
  curriculumId: string
  query: string
  limit?: number
}): Promise<RetrievedChunk[]> {
  const limit = args.limit ?? 4
  const cleaned = args.query.replace(/[^\w\s]/g, " ").trim()

  // Trivially short queries — return the intro.
  if (cleaned.length < 4) {
    const rows = await prisma.curriculumChunk.findMany({
      where: { curriculumId: args.curriculumId },
      orderBy: { chunkIndex: "asc" },
      take: limit,
    })
    return rows.map((r) => ({
      id: r.id,
      source: r.source,
      content: r.content,
      pageNumber: r.pageNumber,
      score: 0,
    }))
  }

  // Try semantic search first.
  try {
    const queryVec = await embedText(cleaned)
    const literal = toPgvectorLiteral(queryVec)
    type SemanticRow = {
      id: string
      source: string
      content: string
      page_number: number | null
      score: number
    }
    const rows = await prisma.$queryRaw<SemanticRow[]>(Prisma.sql`
      SELECT
        id,
        source,
        content,
        "pageNumber" AS page_number,
        (1 - (embedding <=> ${literal}::vector))::float AS score
      FROM "CurriculumChunk"
      WHERE "curriculumId" = ${args.curriculumId}
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${literal}::vector
      LIMIT ${limit}
    `)
    if (rows.length > 0) {
      return rows.map((r) => ({
        id: r.id,
        source: r.source,
        content: r.content,
        pageNumber: r.page_number,
        score: Number(r.score),
      }))
    }
    // No embeddings populated yet — fall through to FTS so dev still works.
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      "semantic retrieval failed; falling back to FTS",
    )
  }

  // FTS fallback.
  type Row = {
    id: string
    source: string
    content: string
    page_number: number | null
    score: number
  }
  const rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
    SELECT
      id,
      source,
      content,
      "pageNumber" AS page_number,
      ts_rank(
        to_tsvector('english', content),
        plainto_tsquery('english', ${cleaned})
      )::float AS score
    FROM "CurriculumChunk"
    WHERE "curriculumId" = ${args.curriculumId}
    ORDER BY score DESC, "chunkIndex" ASC
    LIMIT ${limit}
  `)
  const meaningful = rows.filter((r) => r.score > 0)
  const final = meaningful.length > 0 ? meaningful : rows
  return final.map((r) => ({
    id: r.id,
    source: r.source,
    content: r.content,
    pageNumber: r.page_number,
    score: Number(r.score),
  }))
}
