"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import type { ActivityEvent } from "@pol/shared"

import { apiFetch } from "@/lib/api"

const POLL_FALLBACK_MS = 12_000

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"

/**
 * A slim always-on horizontal ticker that scrolls through recent platform
 * events. Subscribes to /activity/stream over Server-Sent Events when
 * available so new completions appear without a refresh; falls back to
 * polling /activity if the EventSource connection fails.
 */
export function LiveTickerBar() {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null)
  const [transport, setTransport] = useState<"sse" | "poll" | null>(null)
  const lastTickRef = useRef<number>(0)
  const transportRef = useRef<"sse" | "poll" | null>(null)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    let cancelled = false
    let pollTimer: ReturnType<typeof setTimeout> | null = null
    let es: EventSource | null = null

    const apply = (data: { events: ActivityEvent[] }) => {
      if (cancelled) return
      setEvents(data.events ?? [])
      const now = Date.now()
      if (now - lastTickRef.current > 800) {
        setPulse(true)
        window.setTimeout(() => setPulse(false), 1200)
      }
      lastTickRef.current = now
    }

    const startPolling = () => {
      if (transportRef.current === "poll") return
      transportRef.current = "poll"
      setTransport("poll")
      const tick = async () => {
        try {
          const data = await apiFetch<{ events: ActivityEvent[] }>(
            "/activity",
            { token: null },
          )
          apply(data)
        } catch {
          // hold last good data
        } finally {
          if (!cancelled) pollTimer = setTimeout(tick, POLL_FALLBACK_MS)
        }
      }
      tick()
    }

    if (typeof EventSource !== "undefined") {
      try {
        es = new EventSource(`${API_BASE}/api/v1/activity/stream`)
        es.addEventListener("activity", (ev) => {
          try {
            const data = JSON.parse((ev as MessageEvent).data) as {
              events: ActivityEvent[]
            }
            transportRef.current = "sse"
            setTransport("sse")
            apply(data)
          } catch {
            // bad frame — ignore
          }
        })
        es.onerror = () => {
          // SSE dropped — degrade to polling once.
          es?.close()
          es = null
          if (!cancelled) startPolling()
        }
      } catch {
        startPolling()
      }
    } else {
      startPolling()
    }

    return () => {
      cancelled = true
      if (pollTimer) clearTimeout(pollTimer)
      es?.close()
    }
  }, [])

  // Render the events twice end-to-end so the CSS marquee loops seamlessly.
  const list = events && events.length > 0 ? events : null

  return (
    <div className="border-b border-rule bg-paper-deep/40">
      <div className="mx-auto flex h-9 w-[min(1240px,94vw)] items-center gap-4 overflow-hidden">
        <span
          className="hidden shrink-0 items-center gap-2 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-teal sm:inline-flex"
          title={
            transport === "sse"
              ? "Streaming over Server-Sent Events"
              : transport === "poll"
                ? "Polling fallback"
                : "Connecting"
          }
        >
          <span
            className={`live-dot transition-transform duration-300 ${
              pulse ? "scale-150" : "scale-100"
            }`}
          />
          {transport === "sse" ? "live · streaming" : "live"}
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
