"use client"

import { useEffect, useState } from "react"
import type { ChainStatus } from "@pol/shared"

import { apiFetch } from "@/lib/api"

export function ChainBadge() {
  const [status, setStatus] = useState<ChainStatus | null>(null)

  useEffect(() => {
    apiFetch<ChainStatus>("/chain", { token: null })
      .then(setStatus)
      .catch(() => setStatus(null))
  }, [])

  if (!status) {
    return (
      <span className="pill border-rule bg-surface text-ink-faint">
        <span className="h-1.5 w-1.5 rounded-full bg-rule" />
        Chain · …
      </span>
    )
  }

  const live = status.mode === "live"
  return (
    <span
      className={[
        "pill",
        live
          ? "border-forest/40 bg-forest-soft text-forest"
          : "border-amber/40 bg-amber/10 text-amber",
      ].join(" ")}
      title={
        live ? `Live on chain ${status.chainId}` : "Demo mode — tx hashes are simulated"
      }
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          live ? "bg-forest" : "bg-amber",
        ].join(" ")}
      />
      {live ? "Base Sepolia · live" : "Demo mode"}
    </span>
  )
}
