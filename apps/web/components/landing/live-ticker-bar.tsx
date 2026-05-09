"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import type { ActivityEvent } from "@pol/shared"

import { apiFetch } from "@/lib/api"

const REFRESH_MS = 12_000

/**
 * A slim always-on horizontal ticker that scrolls through recent platform
 * events. Sits below the site header, above the hero. Empty state quietly
 * falls back to a single rotating tagline so the demo never looks dead.
 */
export function LiveTickerBar() {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const tick = async () => {
      try {
        const data = await apiFetch<{ events: ActivityEvent[] }>("/activity", {
          token: null,
        })
        if (!cancelled) setEvents(data.events ?? [])
      } catch {
        // hold last good data
      } finally {
        if (!cancelled) timer = setTimeout(tick, REFRESH_MS)
      }
    }
    tick()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [])

  // Render the events twice end-to-end so the CSS marquee loops seamlessly.
  const list = events && events.length > 0 ? events : null

  return (
    <div className="border-b border-rule bg-paper-deep/40">
      <div className="mx-auto flex h-9 w-[min(1240px,94vw)] items-center gap-4 overflow-hidden">
        <span className="hidden shrink-0 items-center gap-2 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-teal sm:inline-flex">
          <span className="live-dot" />
          live
        </span>
        <div className="relative flex flex-1 overflow-hidden">
          {list ? (
            <div className="flex animate-ticker gap-10 whitespace-nowrap">
              {[...list, ...list].map((e, i) => (
                <TickerItem key={`${i}-${e.at}`} event={e} />
              ))}
            </div>
          ) : (
            <div className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint">
              connecting to Base Sepolia…
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TickerItem({ event }: { event: ActivityEvent }) {
  if (event.kind === "completion") {
    const inner = (
      <>
        <span className="font-mono text-[0.6875rem] font-semibold text-forest">
          ✓ paid
        </span>
        <span className="text-[0.8125rem] text-ink-soft">
          {event.studentInitials} earned ₹
          {event.rewardInr.toLocaleString("en-IN")} ·{" "}
          {event.curriculumTitle}
        </span>
      </>
    )
    return event.txHash ? (
      <Link
        href={`/verify/${event.txHash}`}
        className="flex items-center gap-2 hover:text-ink"
      >
        {inner}
      </Link>
    ) : (
      <span className="flex items-center gap-2">{inner}</span>
    )
  }
  if (event.kind === "bounty_funded") {
    return (
      <span className="flex items-center gap-2">
        <span className="font-mono text-[0.6875rem] font-semibold text-teal">
          $ funded
        </span>
        <span className="text-[0.8125rem] text-ink-soft">
          {event.sponsorName} backed{" "}
          {event.maxStudents.toLocaleString("en-IN")} seats · {event.bountyTitle}
        </span>
      </span>
    )
  }
  return (
    <span className="flex items-center gap-2">
      <span className="font-mono text-[0.6875rem] font-semibold text-ink-faint">
        + enrolled
      </span>
      <span className="text-[0.8125rem] text-ink-soft">
        {event.studentInitials} started {event.curriculumTitle}
      </span>
    </span>
  )
}
