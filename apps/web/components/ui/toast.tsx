"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useState } from "react"

// Lightweight, in-house toast system. We don't pull a library because the
// project already has framer-motion, a clear design system, and only a
// handful of call sites. `toast.success(...)`, `toast.error(...)`, and
// `toast.info(...)` are the only knobs anyone needs.

type ToastKind = "success" | "error" | "info"

type Toast = {
  id: number
  kind: ToastKind
  title: string
  description?: string
}

type Listener = (toasts: Toast[]) => void

let counter = 0
let toasts: Toast[] = []
const listeners = new Set<Listener>()

function emit() {
  for (const l of listeners) l(toasts)
}

function push(kind: ToastKind, title: string, description?: string) {
  const id = ++counter
  toasts = [...toasts, { id, kind, title, description }]
  emit()
  // Auto-dismiss after 4.5s — long enough to read, short enough not to
  // pile up if the user triggers several in a row.
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    emit()
  }, 4500)
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export const toast = {
  success: (title: string, description?: string) => push("success", title, description),
  error: (title: string, description?: string) => push("error", title, description),
  info: (title: string, description?: string) => push("info", title, description),
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([])

  useEffect(() => {
    listeners.add(setItems)
    setItems(toasts)
    return () => {
      listeners.delete(setItems)
    }
  }, [])

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed bottom-6 right-6 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.16 } }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto overflow-hidden rounded-xl border border-rule bg-surface shadow-[0_24px_48px_-22px_hsl(var(--ink)/0.3)]"
            role="status"
          >
            <div className="flex items-start gap-3 p-4">
              <Glyph kind={t.kind} />
              <div className="min-w-0 flex-1">
                <div className="font-display text-[0.9375rem] font-medium leading-snug text-ink">
                  {t.title}
                </div>
                {t.description && (
                  <div className="mt-0.5 text-[0.8125rem] leading-relaxed text-ink-muted">
                    {t.description}
                  </div>
                )}
              </div>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => dismiss(t.id)}
                className="-mr-1 -mt-1 grid h-6 w-6 place-items-center rounded-full text-ink-faint transition-colors hover:bg-paper-deep hover:text-ink"
              >
                ×
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function Glyph({ kind }: { kind: ToastKind }) {
  const cls =
    kind === "success"
      ? "bg-teal-soft text-teal"
      : kind === "error"
        ? "bg-terracotta/15 text-terracotta"
        : "bg-paper-deep text-ink-soft"
  const symbol = kind === "success" ? "✓" : kind === "error" ? "!" : "i"
  return (
    <span
      aria-hidden
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[0.8125rem] font-semibold ${cls}`}
    >
      {symbol}
    </span>
  )
}
