import type { Metadata } from "next"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"

type VerifiedCredentialLite = {
  studentName?: string | null
  studentInitials?: string | null
  scorePct?: number
  curriculum?: { title?: string }
}

// Best-effort: hit the public proofs endpoint server-side so social shares
// unfurl with the learner's name and score. If the API isn't reachable
// (offline dev, fresh deploy), fall back to generic copy.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ txHash: string }>
}): Promise<Metadata> {
  const { txHash } = await params
  const fallback: Metadata = {
    title: "Verified credential · EduPay",
    description:
      "Public, on-chain proof of a completed curriculum. Resumes lie. Receipts don't.",
  }
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/proofs/by-tx/${encodeURIComponent(txHash)}`,
      { cache: "no-store" },
    )
    if (!res.ok) return fallback
    const json = (await res.json()) as
      | { success: true; data: { credential: VerifiedCredentialLite } }
      | { success: false }
    if (!json.success) return fallback
    const cred = json.data.credential
    const who = cred.studentName || cred.studentInitials || "A learner"
    const what = cred.curriculum?.title ?? "a curriculum"
    const score = typeof cred.scorePct === "number" ? ` (${cred.scorePct}%)` : ""
    return {
      title: `${who} passed ${what}${score} · EduPay`,
      description: `On-chain proof that ${who} completed ${what}${score}. Verified on Base.`,
    }
  } catch {
    return fallback
  }
}

export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
