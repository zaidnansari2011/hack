"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useMemo, useState } from "react"

type Sender = "sponsor" | "support" | "user"

type Mail = {
  id: string
  from: string
  sender: Sender
  subject: string
  body: string
  replyable: boolean
  createdAt: string
}

// No backend messaging exists — this is a realistic seeded inbox. Read +
// reply state persists in localStorage so it survives a refresh.
const SEED: Mail[] = [
  {
    id: "m-sponsor-1",
    from: "RupeeNest (Sponsor)",
    sender: "sponsor",
    subject: "Loved your progress on the finance track",
    body: "Hi! We sponsor the personal finance bounty you're working through. Your mastery checks look strong. If you finish this week, we have a second bounty opening that pays more. Reply if you want early access.",
    replyable: true,
    createdAt: "2026-05-16T09:20:00Z",
  },
  {
    id: "m-support-1",
    from: "EduPay Support",
    sender: "support",
    subject: "Your UPI payout settled",
    body: "Good news: your most recent payout reached your UPI in under 4 seconds. Nothing is needed from you. This is an automated notice and the address does not accept replies.",
    replyable: false,
    createdAt: "2026-05-15T14:02:00Z",
  },
  {
    id: "m-user-1",
    from: "Aarav (Learner)",
    sender: "user",
    subject: "Study buddy for the Rust bounty?",
    body: "Saw you on the leaderboard. I'm stuck on the ownership module. Want to compare notes and keep each other accountable? Reply and we can set a time.",
    replyable: true,
    createdAt: "2026-05-14T18:45:00Z",
  },
  {
    id: "m-support-2",
    from: "EduPay Support",
    sender: "support",
    subject: "Competitions and Forums are coming",
    body: "We're building head-to-head competitions and learner forums. They're locked in your dashboard for now. You'll get a message here the day they open. No reply needed.",
    replyable: false,
    createdAt: "2026-05-12T11:30:00Z",
  },
]

type InboxState = { read: string[]; replied: string[] }

const KEY = "pol:inbox:v1"

function loadState(): InboxState {
  if (typeof window === "undefined") return { read: [], replied: [] }
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as InboxState) : { read: [], replied: [] }
  } catch {
    return { read: [], replied: [] }
  }
}

function saveState(s: InboxState) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // non-fatal
  }
}

const SENDER_TINT: Record<Sender, string> = {
  sponsor: "bg-teal/10 text-teal",
  support: "bg-amber/10 text-amber",
  user: "bg-forest/10 text-forest",
}

export function MailInbox() {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<InboxState>({ read: [], replied: [] })
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [justSent, setJustSent] = useState(false)

  useEffect(() => {
    setState(loadState())
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  const unread = useMemo(
    () => SEED.filter((m) => !state.read.includes(m.id)).length,
    [state.read],
  )

  const active = SEED.find((m) => m.id === activeId) ?? null

  function openMessage(m: Mail) {
    setActiveId(m.id)
    setDraft("")
    setJustSent(false)
    if (!state.read.includes(m.id)) {
      const next = { ...state, read: [...state.read, m.id] }
      setState(next)
      saveState(next)
    }
  }

  function sendReply() {
    if (!active || !draft.trim()) return
    const next = {
      ...state,
      replied: state.replied.includes(active.id)
        ? state.replied
        : [...state.replied, active.id],
    }
    setState(next)
    saveState(next)
    setDraft("")
    setJustSent(true)
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

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[80] flex justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
            <motion.div
              className="relative z-10 flex h-full w-[min(440px,92vw)] flex-col border-l border-rule bg-surface"
              initial={{ x: 40 }}
              animate={{ x: 0 }}
              exit={{ x: 40 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center justify-between border-b border-rule px-5 py-4">
                <div>
                  <h3 className="font-display text-[1.0625rem] font-medium text-ink">
                    {active ? "Message" : "Inbox"}
                  </h3>
                  <p className="text-[0.75rem] text-ink-muted">
                    {active
                      ? active.from
                      : `${unread} unread of ${SEED.length}`}
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
                <ul className="min-h-0 flex-1 divide-y divide-rule overflow-y-auto">
                  {SEED.map((m) => {
                    const isRead = state.read.includes(m.id)
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => openMessage(m)}
                          className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-soft"
                        >
                          <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-[0.6875rem] font-semibold ${SENDER_TINT[m.sender]}`}>
                            {m.from[0]}
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
                              {m.from} · {m.replyable ? "Replyable" : "No-reply"}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.625rem] font-medium uppercase tracking-[0.14em] ${SENDER_TINT[active.sender]}`}>
                    {active.sender}
                  </span>
                  <h4 className="mt-3 font-display text-[1.125rem] font-medium text-ink">
                    {active.subject}
                  </h4>
                  <p className="mt-3 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-ink-soft">
                    {active.body}
                  </p>

                  <div className="mt-6 border-t border-rule pt-5">
                    {active.replyable ? (
                      justSent || state.replied.includes(active.id) ? (
                        <div className="rounded-lg border border-forest/30 bg-forest/5 px-4 py-3 text-[0.875rem] text-forest">
                          ✓ Reply sent. They'll get back to you here.
                        </div>
                      ) : (
                        <div>
                          <label className="text-[0.8125rem] font-medium text-ink-soft">
                            Reply to {active.from}
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
                              onClick={sendReply}
                              disabled={!draft.trim()}
                              className="rounded-full bg-ink px-5 py-2 text-[0.8125rem] font-medium text-paper transition-colors hover:bg-ink/85 disabled:opacity-40"
                            >
                              Send reply
                            </button>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="rounded-lg border border-rule bg-paper px-4 py-3 text-[0.8125rem] text-ink-muted">
                        This is a no-reply message. You can't respond to this
                        sender.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
