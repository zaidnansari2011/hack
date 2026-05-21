"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useState } from "react"

import { ApiClientError, apiFetch } from "@/lib/api"
import { useScrollLock } from "@/lib/use-scroll-lock"

type Stage = "compose" | "sending" | "sent" | "error"

type Props = {
  open: boolean
  onClose: () => void
  recipientAddress: string
  recipientLabel: string
  contextHint?: string
}

// Anonymous recruiter compose flow. Posts to the public outreach endpoint
// (rate-limited server-side). Persists the recruiter's name/email/company
// to localStorage so repeat outreach is one-step.
export function ReachOutModal({
  open,
  onClose,
  recipientAddress,
  recipientLabel,
  contextHint,
}: Props) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [company, setCompany] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [stage, setStage] = useState<Stage>("compose")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Hydrate from localStorage on first open so a returning recruiter
  // doesn't retype their identity for every candidate.
  useEffect(() => {
    if (!open || typeof window === "undefined") return
    try {
      setName(window.localStorage.getItem("pol:recruiter:name") ?? "")
      setEmail(window.localStorage.getItem("pol:recruiter:email") ?? "")
      setCompany(window.localStorage.getItem("pol:recruiter:company") ?? "")
    } catch {
      // localStorage can throw in private mode; not fatal.
    }
  }, [open])

  useScrollLock(open)

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  // Reset transient state when the modal closes, but keep persisted identity.
  useEffect(() => {
    if (open) return
    setSubject("")
    setBody("")
    setStage("compose")
    setErrorMsg(null)
  }, [open])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (stage === "sending") return
    setStage("sending")
    setErrorMsg(null)
    try {
      await apiFetch<{ id: string }>("/recruiter-messages", {
        method: "POST",
        token: null,
        json: {
          recipientAddress,
          senderName: name.trim(),
          senderEmail: email.trim(),
          senderCompany: company.trim() || undefined,
          subject: subject.trim(),
          body: body.trim(),
        },
      })
      try {
        window.localStorage.setItem("pol:recruiter:name", name.trim())
        window.localStorage.setItem("pol:recruiter:email", email.trim())
        if (company.trim()) {
          window.localStorage.setItem("pol:recruiter:company", company.trim())
        }
      } catch {
        // non-fatal
      }
      setStage("sent")
    } catch (err) {
      setStage("error")
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : "Could not send. Please try again.",
      )
    }
  }

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    subject.trim().length > 0 &&
    body.trim().length > 0

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-ink/55 backdrop-blur-sm" />
          <motion.div
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-rule bg-surface shadow-[0_32px_80px_-20px_hsl(218_45%_10%_/_0.35)]"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-rule px-6 py-4">
              <div>
                <h2 className="font-display text-[1.0625rem] font-medium text-ink">
                  Reach out to {recipientLabel}
                </h2>
                <p className="mt-0.5 font-mono text-[0.6875rem] text-ink-faint">
                  {recipientAddress.slice(0, 10)}…{recipientAddress.slice(-8)}
                  {contextHint && (
                    <>
                      <span className="mx-2">·</span>
                      {contextHint}
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-7 w-7 place-items-center rounded-full border border-rule text-ink-faint transition-colors hover:border-ink/30 hover:text-ink"
              >
                ×
              </button>
            </div>

            {stage === "sent" ? (
              <div className="space-y-3 p-6">
                <div className="rounded-lg border border-forest/30 bg-forest/5 p-4 text-[0.875rem] text-forest">
                  ✓ Sent. {recipientLabel} will see your message in their EduPay inbox. They&rsquo;ll be notified the next time they sign in.
                </div>
                <p className="text-[0.8125rem] text-ink-muted">
                  Replies land back in this same conversation. We&rsquo;ll email you at <span className="text-ink">{email}</span> once a reply comes in.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full bg-ink px-5 py-2 text-[0.8125rem] font-medium text-paper transition-colors hover:bg-ink/85"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4 p-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Your name" required>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Priya Sharma"
                      autoFocus
                      required
                      className="w-full rounded-md border border-rule bg-paper px-3 py-2 text-[0.875rem] text-ink focus:border-ink/30 focus:outline-none"
                    />
                  </Field>
                  <Field label="Your email" required>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="priya@example.com"
                      required
                      className="w-full rounded-md border border-rule bg-paper px-3 py-2 text-[0.875rem] text-ink focus:border-ink/30 focus:outline-none"
                    />
                  </Field>
                </div>

                <Field label="Company" optional>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Stripe, Razorpay, freelance…"
                    className="w-full rounded-md border border-rule bg-paper px-3 py-2 text-[0.875rem] text-ink focus:border-ink/30 focus:outline-none"
                  />
                </Field>

                <Field label="Subject" required>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Senior Solidity engineer role"
                    required
                    className="w-full rounded-md border border-rule bg-paper px-3 py-2 text-[0.875rem] text-ink focus:border-ink/30 focus:outline-none"
                  />
                </Field>

                <Field label="Message" required>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={6}
                    placeholder={`Hi ${recipientLabel.split(" ")[0] || "there"} — I saw your verified pass on EduPay and wanted to reach out about a role…`}
                    required
                    className="w-full resize-none rounded-md border border-rule bg-paper px-3 py-2 text-[0.875rem] text-ink focus:border-ink/30 focus:outline-none"
                  />
                </Field>

                {stage === "error" && errorMsg && (
                  <div className="rounded-md border border-terracotta/30 bg-terracotta/5 px-3 py-2 text-[0.8125rem] text-terracotta">
                    {errorMsg}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="text-[0.75rem] text-ink-faint">
                    EduPay never shares your email publicly.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-full border border-rule bg-surface px-4 py-2 text-[0.8125rem] text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!canSubmit || stage === "sending"}
                      className="rounded-full bg-ink px-5 py-2 text-[0.8125rem] font-medium text-paper transition-colors hover:bg-ink/85 disabled:opacity-40"
                    >
                      {stage === "sending" ? "Sending…" : "Send outreach"}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Field({
  label,
  required,
  optional,
  children,
}: {
  label: string
  required?: boolean
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-[0.75rem] font-medium text-ink-soft">
        {label}
        {required && <span className="text-terracotta">*</span>}
        {optional && <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-faint">opt</span>}
      </span>
      {children}
    </label>
  )
}
