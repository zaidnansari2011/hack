"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useCallback, useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import type { RecruiterMessage } from "@pol/shared"

import { ApiClientError, apiFetch } from "@/lib/api"

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; messages: RecruiterMessage[] }

export function MailInbox() {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<LoadState>({ status: "idle" })
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [justSent, setJustSent] = useState(false)
  const [replying, setReplying] = useState(false)
  const [mounted, setMounted] = useState(false)
  // Initial unread badge — fetched lazily on first hover/open so we don't
  // ping the API on every page load when the student isn't checking mail.
  const [unreadCount, setUnreadCount] = useState<number | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const loadInbox = useCallback(async () => {
    setState({ status: "loading" })
    try {
      const data = await apiFetch<{ messages: RecruiterMessage[] }>(
        "/recruiter-messages",
      )
      setState({ status: "ready", messages: data.messages })
      setUnreadCount(data.messages.filter((m) => m.readAt === null).length)
    } catch (err) {
      setState({
        status: "error",
        message:
          err instanceof ApiClientError
            ? err.message
            : "Couldn't load your inbox.",
      })
    }
  }, [])

  // Fetch a lightweight unread count once on mount so the header badge
  // can show even before the drawer is opened.
  useEffect(() => {
    let cancelled = false
    apiFetch<{ messages: RecruiterMessage[] }>("/recruiter-messages")
      .then((data) => {
        if (cancelled) return
        setUnreadCount(data.messages.filter((m) => m.readAt === null).length)
        // Keep state for instant render on open; saves a second round-trip.
        setState({ status: "ready", messages: data.messages })
      })
      .catch(() => {
        if (cancelled) return
        // Silent — the badge just stays absent until the drawer opens.
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Re-fetch whenever the drawer opens, so the inbox stays fresh after
  // long-lived sessions. Cheap; the endpoint is paginated implicitly via
  // the per-user index.
  useEffect(() => {
    if (!open) return
    loadInbox()
  }, [open, loadInbox])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  // Scroll-lock the page behind the drawer. Compensates body padding-right
  // for the scrollbar so the layout doesn't jump when locking.
  useEffect(() => {
    if (!open) return
    const body = document.body
    const prevOverflow = body.style.overflow
    const prevPaddingRight = body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    body.style.overflow = "hidden"
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }
    return () => {
      body.style.overflow = prevOverflow
      body.style.paddingRight = prevPaddingRight
    }
  }, [open])

  const messages = state.status === "ready" ? state.messages : []
  const active = useMemo(
    () => messages.find((m) => m.id === activeId) ?? null,
    [messages, activeId],
  )
  const total = messages.length
  const unread = unreadCount ?? messages.filter((m) => m.readAt === null).length

  async function openMessage(m: RecruiterMessage) {
    setActiveId(m.id)
    setDraft("")
    setJustSent(false)
    if (m.readAt === null) {
      // Optimistic: stamp readAt locally so the bullet disappears immediately.
      setState((prev) =>
        prev.status === "ready"
          ? {
              status: "ready",
              messages: prev.messages.map((x) =>
                x.id === m.id ? { ...x, readAt: new Date().toISOString() } : x,
              ),
            }
          : prev,
      )
      setUnreadCount((c) => (c !== null ? Math.max(0, c - 1) : c))
      try {
        await apiFetch(`/recruiter-messages/${m.id}/read`, { method: "POST" })
      } catch {
        // Mark-read is best-effort; the next inbox load will resync.
      }
    }
  }

  async function sendReply() {
    if (!active || !draft.trim() || replying) return
    setReplying(true)
    try {
      const { message } = await apiFetch<{ message: RecruiterMessage }>(
        `/recruiter-messages/${active.id}/reply`,
        { method: "POST", json: { body: draft.trim() } },
      )
      setState((prev) =>
        prev.status === "ready"
          ? {
              status: "ready",
              messages: prev.messages.map((x) =>
                x.id === message.id ? message : x,
              ),
            }
          : prev,
      )
      setDraft("")
      setJustSent(true)
    } catch (err) {
      // Surface a minimal error inline — the textarea stays so the user
      // can retry without losing their draft.
      setJustSent(false)
      window.alert(
        err instanceof ApiClientError ? err.message : "Could not send reply.",
      )
    } finally {
      setReplying(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open inbox"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-rule bg-surface text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-terracotta px-1 font-mono text-[0.5625rem] font-semibold text-paper">
            {unread}
          </span>
        )}
      </button>

      {mounted && createPortal(
        <AnimatePresence>
          {open && (
          <motion.div
            className="fixed inset-0 z-[100] flex justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onWheel={(e) => { if (e.target === e.currentTarget) e.preventDefault() }}
          >
            <div
              className="absolute inset-0 bg-ink/55 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="relative z-10 flex h-full w-[min(460px,92vw)] flex-col border-l border-rule bg-surface shadow-[0_0_40px_-8px_hsl(218_45%_10%/0.35)]"
              initial={{ x: 40 }}
              animate={{ x: 0 }}
              exit={{ x: 40 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center justify-between border-b border-rule px-5 py-4">
                <div>
                  <h3 className="font-display text-[1.0625rem] font-medium text-ink">
                    {active ? "Message" : "Recruiter inbox"}
                  </h3>
                  <p className="text-[0.75rem] text-ink-muted">
                    {active
                      ? `${active.senderName}${active.senderCompany ? ` · ${active.senderCompany}` : ""}`
                      : state.status === "loading"
                        ? "Loading…"
                        : state.status === "error"
                          ? "Couldn't load"
                          : `${unread} unread of ${total}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {active && (
                    <button
                      type="button"
                      onClick={() => setActiveId(null)}
                      className="text-[0.8125rem] text-ink-faint transition-colors hover:text-ink"
                    >
                      ← Back
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close inbox"
                    className="grid h-7 w-7 place-items-center rounded-full border border-rule text-ink-faint transition-colors hover:border-ink/30 hover:text-ink"
                  >
                    ×
                  </button>
                </div>
              </div>

              {!active ? (
                <InboxList state={state} onOpen={openMessage} />
              ) : (
                <MessageView
                  message={active}
                  draft={draft}
                  setDraft={setDraft}
                  replying={replying}
                  justSent={justSent}
                  onSend={sendReply}
                />
              )}
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}

function InboxList({
  state,
  onOpen,
}: {
  state: LoadState
  onOpen: (m: RecruiterMessage) => void
}) {
  if (state.status === "loading" || state.status === "idle") {
    return (
      <ul className="min-h-0 flex-1 divide-y divide-rule overflow-y-auto">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex items-start gap-3 px-5 py-4">
            <div className="mt-0.5 h-8 w-8 shrink-0 animate-pulse rounded-full bg-rule/40" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 animate-pulse rounded bg-rule/40" />
              <div className="h-2.5 w-1/2 animate-pulse rounded bg-rule/30" />
            </div>
          </li>
        ))}
      </ul>
    )
  }
  if (state.status === "error") {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8 text-center">
        <p className="text-[0.875rem] text-ink-muted">{state.message}</p>
      </div>
    )
  }
  if (state.messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-8 py-10 text-center">
        <p className="font-display text-[1.0625rem] font-medium text-ink">
          No outreach yet.
        </p>
        <p className="max-w-[26ch] text-[0.8125rem] leading-relaxed text-ink-muted">
          When a recruiter reaches out through your verified profile, their message lands here. Keep passing curricula to grow your visibility.
        </p>
      </div>
    )
  }
  return (
    <ul className="min-h-0 flex-1 divide-y divide-rule overflow-y-auto">
      {state.messages.map((m) => {
        const isRead = m.readAt !== null
        const hasReplied = m.replyBody !== null
        return (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => onOpen(m)}
              className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-soft"
            >
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal/10 text-[0.6875rem] font-semibold text-teal">
                {initials(m.senderName)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  {!isRead && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-terracotta" />
                  )}
                  <span className={`truncate text-[0.875rem] ${isRead ? "text-ink-soft" : "font-semibold text-ink"}`}>
                    {m.subject}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-[0.75rem] text-ink-muted">
                  {m.senderName}
                  {m.senderCompany ? ` · ${m.senderCompany}` : ""}
                  {hasReplied ? " · Replied" : ""}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function MessageView({
  message,
  draft,
  setDraft,
  replying,
  justSent,
  onSend,
}: {
  message: RecruiterMessage
  draft: string
  setDraft: (s: string) => void
  replying: boolean
  justSent: boolean
  onSend: () => void
}) {
  const alreadyReplied = message.replyBody !== null
  const showSentBanner = justSent || alreadyReplied
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-5">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-teal/10 px-2.5 py-1 text-[0.625rem] font-medium uppercase tracking-[0.14em] text-teal">
        Recruiter
      </span>
      <h4 className="mt-3 font-display text-[1.125rem] font-medium text-ink">
        {message.subject}
      </h4>
      <div className="mt-2 text-[0.75rem] text-ink-muted">
        From <span className="text-ink-soft">{message.senderName}</span>
        {message.senderCompany && (
          <>
            {" · "}
            <span className="text-ink-soft">{message.senderCompany}</span>
          </>
        )}
        {" · "}
        <a
          href={`mailto:${message.senderEmail}`}
          className="text-teal underline-offset-4 hover:underline"
        >
          {message.senderEmail}
        </a>
      </div>
      <p className="mt-4 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-ink-soft">
        {message.body}
      </p>

      <div className="mt-6 border-t border-rule pt-5">
        {showSentBanner ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-forest/30 bg-forest/5 px-4 py-3 text-[0.875rem] text-forest">
              ✓ Reply sent. {message.senderName.split(" ")[0]} will hear back from you at {message.senderEmail}.
            </div>
            {message.replyBody && (
              <div>
                <div className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-faint">
                  Your reply
                </div>
                <p className="mt-1.5 whitespace-pre-wrap rounded-md border border-rule bg-paper p-3 text-[0.875rem] leading-relaxed text-ink-soft">
                  {message.replyBody}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <label className="text-[0.8125rem] font-medium text-ink-soft">
              Reply to {message.senderName.split(" ")[0]}
            </label>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              placeholder="Write a reply…"
              className="mt-2 w-full resize-none rounded-lg border border-rule bg-paper px-3 py-2.5 text-[0.875rem] text-ink placeholder:text-ink-faint focus:border-ink/30 focus:outline-none"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={onSend}
                disabled={!draft.trim() || replying}
                className="rounded-full bg-ink px-5 py-2 text-[0.8125rem] font-medium text-paper transition-colors hover:bg-ink/85 disabled:opacity-40"
              >
                {replying ? "Sending…" : "Send reply"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?"
}
