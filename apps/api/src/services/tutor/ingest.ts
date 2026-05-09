import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { prisma } from "@/db/prisma"
import { logger } from "@/config/logger"

type ParsedDoc = {
  frontmatter: Record<string, string>
  body: string
}

/** Minimal frontmatter parser — we control the input, no need for a YAML lib. */
function parseFrontmatter(raw: string): ParsedDoc {
  const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/)
  if (!fmMatch) return { frontmatter: {}, body: raw }
  const fmBlock = fmMatch[1] ?? ""
  const body = fmMatch[2] ?? ""
  const frontmatter: Record<string, string> = {}
  for (const line of fmBlock.split(/\r?\n/)) {
    const m = line.match(/^(\w+)\s*:\s*(.+?)\s*$/)
    if (m && m[1]) frontmatter[m[1]] = m[2] ?? ""
  }
  return { frontmatter, body }
}

type Chunk = {
  index: number
  topic: string
  content: string
}

/**
 * Split markdown into chunks at H1 boundaries, then collapse whitespace. Each
 * H1 heading becomes the chunk's `topic` (also indexed via FTS). For longer
 * sections we keep splitting at blank-line boundaries so no chunk exceeds the
 * soft cap.
 */
function chunkMarkdown(body: string, softMaxChars = 1100): Chunk[] {
  const sections = body.split(/^# /m).filter((s) => s.trim().length > 0)
  const chunks: Chunk[] = []
  let idx = 0

  for (const section of sections) {
    const lines = section.split(/\r?\n/)
    const topic = (lines[0] ?? "").trim()
    const text = lines.slice(1).join("\n").trim()
    if (!text || !topic) continue

    const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    let buf = ""
    for (const p of paragraphs) {
      if (buf.length + p.length + 1 > softMaxChars && buf.length > 0) {
        chunks.push({
          index: idx++,
          topic,
          content: buf.replace(/\s+/g, " ").trim(),
        })
        buf = ""
      }
      buf = buf ? `${buf}\n\n${p}` : p
    }
    if (buf.length > 0) {
      chunks.push({
        index: idx++,
        topic,
        content: buf.replace(/\s+/g, " ").trim(),
      })
    }
  }

  return chunks
}

export async function ingestCurriculumFile(args: {
  curriculumId: string
  filePath: string
}) {
  const raw = readFileSync(args.filePath, "utf8")
  const { frontmatter, body } = parseFrontmatter(raw)
  const source = frontmatter.source ?? "curriculum"
  const chunks = chunkMarkdown(body)

  // Replace existing chunks atomically so re-running ingest is idempotent.
  await prisma.$transaction([
    prisma.curriculumChunk.deleteMany({
      where: { curriculumId: args.curriculumId },
    }),
    prisma.curriculumChunk.createMany({
      data: chunks.map((c) => ({
        curriculumId: args.curriculumId,
        chunkIndex: c.index,
        content: `${c.topic}\n\n${c.content}`,
        source: `${source}#${c.topic.toLowerCase().replace(/\s+/g, "-")}`,
        pageNumber: c.index + 1,
      })),
    }),
  ])

  logger.info(
    { curriculumId: args.curriculumId, chunkCount: chunks.length },
    "ingested curriculum",
  )
  return chunks.length
}

export function resolveContentPath(filename: string): string {
  // Files live alongside src/ at runtime (tsx) and dist/ in build — try both.
  return resolve(__dirname, "../../content", filename)
}
