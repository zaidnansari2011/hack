import type { Metadata } from "next"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"

type WalletProfileLite = {
  displayName?: string | null
  initials?: string | null
  totals?: { credentials?: number }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string }>
}): Promise<Metadata> {
  const { address } = await params
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`
  const fallback: Metadata = {
    title: `Wallet ${short} · EduPay`,
    description:
      "Public, on-chain learning transcript. Every credential is a soulbound token verified on Base.",
  }
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/credentials/by-address/${encodeURIComponent(address)}`,
      { cache: "no-store" },
    )
    if (!res.ok) return fallback
    const json = (await res.json()) as
      | { success: true; data: { profile: WalletProfileLite } }
      | { success: false }
    if (!json.success) return fallback
    const p = json.data.profile
    const who = p.displayName || p.initials || short
    const count = p.totals?.credentials ?? 0
    return {
      title: `${who} · ${count} verified credential${count === 1 ? "" : "s"} · EduPay`,
      description: `On-chain learning transcript for ${who}. ${count} verified credential${count === 1 ? "" : "s"} on Base.`,
    }
  } catch {
    return fallback
  }
}

export default function CredentialsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
