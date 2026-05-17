"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

import { authStore } from "@/lib/auth-store"
import { useAuth } from "@/lib/use-auth"
import { cn } from "@/lib/utils"

type ActiveModal = "edit-profile" | "contact" | null

const SPONSOR_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/bounties/new", label: "New bounty" },
] as const

export function AuthPill() {
  const router = useRouter()
  const { user, hydrated } = useAuth()
  const [open, setOpen] = useState(false)
  const [modal, setModal] = useState<ActiveModal>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener("mousedown", onClick)
    return () => window.removeEventListener("mousedown", onClick)
  }, [open])

  if (!hydrated) {
    return <div className="h-9 w-28 animate-pulse rounded-full bg-rule/50" />
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="group inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[0.8125rem] font-medium text-paper transition-all duration-300 ease-out-quart hover:bg-ink/90"
      >
        Sign in
        <span className="translate-x-0 transition-transform duration-300 ease-out-quart group-hover:translate-x-0.5">
          ↗
        </span>
      </Link>
    )
  }

  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => (p[0] ?? "").toUpperCase())
    .join("")

  const openModal = (m: ActiveModal) => {
    setOpen(false)
    setModal(m)
  }

  return (
    <>
      <div ref={wrapRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="group inline-flex items-center gap-2.5 rounded-full border border-rule bg-surface px-2 py-1.5 text-[0.8125rem] font-medium text-ink transition-all duration-300 ease-out-quart hover:border-ink/30"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-[0.6875rem] font-semibold tracking-wide text-paper">
            {initials || "?"}
          </span>
          <span className="hidden max-w-[110px] truncate sm:inline">{user.name}</span>
          <span
            className={cn(
              "mr-1.5 text-[0.625rem] text-ink-faint transition-transform duration-300",
              open && "rotate-180",
            )}
          >
            ▾
          </span>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-md border border-rule bg-surface shadow-[0_24px_48px_-22px_hsl(var(--ink)/0.25)]"
            >
              <div className="border-b border-rule-soft px-4 py-3.5">
                <div className="eyebrow eyebrow-tick text-[0.625rem]">{user.role}</div>
                <div className="mt-1 truncate font-display text-[0.9375rem] font-medium text-ink">
                  {user.name}
                </div>
                <div className="truncate font-mono text-[0.6875rem] text-ink-faint">
                  {user.email}
                </div>
              </div>

              <div className="p-1.5">
                {user.role === "sponsor" ? (
                  SPONSOR_LINKS.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between rounded-sm px-3 py-2 text-[0.875rem] text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink"
                    >
                      <span>{l.label}</span>
                      <span className="text-ink-faint">→</span>
                    </Link>
                  ))
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => openModal("edit-profile")}
                      className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-[0.875rem] text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink"
                    >
                      <span>Edit profile</span>
                      <span className="text-ink-faint">→</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal("contact")}
                      className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-[0.875rem] text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink"
                    >
                      <span>Contact</span>
                      <span className="text-ink-faint">→</span>
                    </button>
                  </>
                )}
              </div>

              <div className="border-t border-rule-soft p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    authStore.clear()
                    setOpen(false)
                    router.push("/")
                  }}
                  className="block w-full rounded-sm px-3 py-2 text-left text-[0.875rem] text-ink-muted transition-colors hover:bg-paper-deep hover:text-ink"
                >
                  Sign out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <EditProfileModal user={user} open={modal === "edit-profile"} onClose={() => setModal(null)} />
      <ContactModal open={modal === "contact"} onClose={() => setModal(null)} />
    </>
  )
}

function ModalShell({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" />
          <motion.div
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-rule bg-surface shadow-[0_32px_80px_-20px_hsl(218_45%_10%_/_0.35)]"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-rule px-6 py-4">
              <h2 className="font-display text-[1.0625rem] font-medium text-ink">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-7 w-7 place-items-center rounded-full border border-rule text-ink-faint transition-colors hover:border-ink/30 hover:text-ink"
              >
                ×
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function EditProfileModal({
  user,
  open,
  onClose,
}: {
  user: { name: string; email: string }
  open: boolean
  onClose: () => void
}) {
  const [name, setName] = useState(user.name)
  const [upiId, setUpiId] = useState("")
  const [saved, setSaved] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 1200)
  }

  return (
    <ModalShell open={open} onClose={onClose} title="Edit profile">
      <form onSubmit={handleSave} className="space-y-4 p-6">
        <div className="space-y-1.5">
          <label className="text-[0.8125rem] font-medium text-ink-soft" htmlFor="prof-name">
            Name
          </label>
          <input
            id="prof-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-rule bg-paper px-3 py-2.5 text-[0.9375rem] text-ink placeholder:text-ink-faint focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-ink/8"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[0.8125rem] font-medium text-ink-soft" htmlFor="prof-email">
            Email
          </label>
          <input
            id="prof-email"
            type="email"
            value={user.email}
            disabled
            className="w-full rounded-lg border border-rule bg-paper-deep px-3 py-2.5 text-[0.9375rem] text-ink-faint"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[0.8125rem] font-medium text-ink-soft" htmlFor="prof-upi">
            UPI ID
          </label>
          <input
            id="prof-upi"
            type="text"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="yourname@upi"
            className="w-full rounded-lg border border-rule bg-paper px-3 py-2.5 text-[0.9375rem] text-ink placeholder:text-ink-faint focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-ink/8"
          />
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="text-[0.875rem] text-ink-faint transition-colors hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2 text-[0.875rem] font-medium text-paper transition-all hover:bg-ink/85"
          >
            {saved ? "Saved!" : "Save changes"}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

function ContactModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [message, setMessage] = useState("")
  const [sent, setSent] = useState(false)

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    setSent(true)
    setTimeout(() => { setSent(false); setMessage(""); onClose() }, 1400)
  }

  return (
    <ModalShell open={open} onClose={onClose} title="Contact us">
      {sent ? (
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <div className="text-[2rem]">✓</div>
          <p className="font-display text-[1rem] font-medium text-ink">Message sent.</p>
          <p className="text-[0.875rem] text-ink-muted">We'll get back to you within 24 hours.</p>
        </div>
      ) : (
        <form onSubmit={handleSend} className="space-y-4 p-6">
          <p className="text-[0.875rem] leading-relaxed text-ink-muted">
            Questions, feedback, or issues? Write to us and we'll reply within 24 hours.
          </p>
          <div className="space-y-1.5">
            <label className="text-[0.8125rem] font-medium text-ink-soft" htmlFor="contact-msg">
              Message
            </label>
            <textarea
              id="contact-msg"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what's on your mind..."
              required
              className="w-full resize-none rounded-lg border border-rule bg-paper px-3 py-2.5 text-[0.9375rem] text-ink placeholder:text-ink-faint focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-ink/8"
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <a
              href="mailto:khuzemze@gmail.com"
              className="text-[0.8125rem] text-ink-faint underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              Or email us directly
            </a>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2 text-[0.875rem] font-medium text-paper transition-all hover:bg-ink/85"
            >
              Send message
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  )
}
