"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useMemo, useState } from "react"
import type { AuthResponse, DemoAccount, UserRole } from "@pol/shared"

import { ApiClientError, apiFetch } from "@/lib/api"
import { authStore } from "@/lib/auth-store"
import { useAuth } from "@/lib/use-auth"
import { AuthCard } from "@/components/auth/auth-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

// Every seeded account uses this password. The API still validates it on
// every login; we just hardcode it here so the picker works in one tap.
const DEMO_PASSWORD = "demo1234"

// Fallback used while the API call is in flight or if it fails — keeps
// the page useful even when the backend is unreachable.
const FALLBACK_ACCOUNTS: DemoAccount[] = [
  {
    email: "sponsor@demo.pol",
    name: "Acme CSR Foundation",
    role: "sponsor",
    detail: "Primary demo sponsor",
  },
  {
    email: "student@demo.pol",
    name: "Demo Student",
    role: "student",
    detail: "Primary demo student",
  },
]

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  )
}

function LoginInner() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get("next")
  const requestedRole = (params.get("role") as UserRole | null) ?? null
  const { user, hydrated } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<DemoAccount[] | null>(null)
  const [accountsError, setAccountsError] = useState(false)

  // Already signed in? Bounce to where they were headed (?next=) or to
  // their role dashboard. Without this, the footer's "Sign in" link and
  // the landing quick-access tiles silently overwrite an active session.
  useEffect(() => {
    if (!hydrated || !user) return
    const target = next ?? (user.role === "sponsor" ? "/dashboard" : "/learn")
    router.replace(target)
  }, [hydrated, user, next, router])

  // Show a session-expired toast if apiFetch redirected us here.
  useEffect(() => {
    if (params.get("reason") === "expired") {
      toast.info("Session expired", "Please sign in again to continue.")
    }
  }, [params])

  // Load the list of seeded demo accounts so the picker stays in sync
  // with the database, no matter how many sponsors/students the seed
  // creates.
  useEffect(() => {
    let cancelled = false
    apiFetch<{ accounts: DemoAccount[] }>("/auth/demo-accounts", { token: null })
      .then(({ accounts }) => {
        if (!cancelled) setAccounts(accounts)
      })
      .catch(() => {
        if (!cancelled) {
          setAccounts(FALLBACK_ACCOUNTS)
          setAccountsError(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function submit(creds: { email: string; password: string }) {
    setError(null)
    setSubmitting(true)
    try {
      const data = await apiFetch<AuthResponse>("/auth/login", {
        method: "POST",
        json: creds,
        token: null,
      })
      authStore.set(data.user, data.token)
      const target =
        next ?? (data.user.role === "sponsor" ? "/dashboard" : "/learn")
      router.push(target)
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Could not reach the server",
      )
    } finally {
      setSubmitting(false)
    }
  }

  function pickAccount(account: DemoAccount) {
    setEmail(account.email)
    setPassword(DEMO_PASSWORD)
    submit({ email: account.email, password: DEMO_PASSWORD })
  }

  const { sponsors, students } = useMemo(() => {
    const list = accounts ?? []
    return {
      sponsors: list.filter((a) => a.role === "sponsor"),
      students: list.filter((a) => a.role === "student"),
    }
  }, [accounts])

  // When the visitor came in via /login?role=student or ?role=sponsor,
  // prefill from the first matching demo account so the manual form is
  // also useful for one-tap demos.
  useEffect(() => {
    if (!requestedRole || !accounts) return
    const match = accounts.find((a) => a.role === requestedRole)
    if (match) {
      setEmail(match.email)
      setPassword(DEMO_PASSWORD)
    }
  }, [requestedRole, accounts])

  const loading = accounts === null

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Good to see you again. Pick up right where you left off."
      footer={
        <>
          New here?{" "}
          <Link
            href="/signup"
            className="font-semibold text-ink underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit({ email, password })
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="border-l-2 border-terracotta bg-terracotta/5 px-4 py-2.5 text-[0.8125rem] text-terracotta">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-8 space-y-4">
        <div className="flex items-baseline justify-between">
          <div className="eyebrow eyebrow-tick text-[0.625rem]">
            Demo accounts
          </div>
          <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-faint">
            password · demo1234
          </span>
        </div>

        {accountsError && (
          <p className="text-[0.75rem] text-ink-muted">
            Couldn&rsquo;t reach the server, showing the built-in defaults.
          </p>
        )}

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-md border border-rule bg-surface-soft"
              />
            ))}
          </div>
        ) : (
          <div className="max-h-[340px] space-y-5 overflow-y-auto pr-1">
            {sponsors.length > 0 && (
              <AccountGroup
                title="Sponsors"
                count={sponsors.length}
                accounts={sponsors}
                onPick={pickAccount}
                disabled={submitting}
                highlightRole={requestedRole}
              />
            )}
            {students.length > 0 && (
              <AccountGroup
                title="Students"
                count={students.length}
                accounts={students}
                onPick={pickAccount}
                disabled={submitting}
                highlightRole={requestedRole}
              />
            )}
          </div>
        )}
      </div>
    </AuthCard>
  )
}

function AccountGroup({
  title,
  count,
  accounts,
  onPick,
  disabled,
  highlightRole,
}: {
  title: string
  count: number
  accounts: DemoAccount[]
  onPick: (a: DemoAccount) => void
  disabled: boolean
  highlightRole: UserRole | null
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <h3 className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-ink-soft">
          {title}
        </h3>
        <span className="font-mono text-[0.625rem] text-ink-faint">
          {count}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-1.5">
        {accounts.map((a) => {
          const isHighlighted = highlightRole === a.role
          return (
            <button
              key={a.email}
              type="button"
              disabled={disabled}
              onClick={() => onPick(a)}
              className={cn(
                "group rounded-md border px-3 py-2.5 text-left transition-all duration-300 ease-out-quart disabled:cursor-not-allowed disabled:opacity-60",
                isHighlighted
                  ? "border-teal/40 bg-teal-soft/40 hover:border-teal/60"
                  : "border-rule bg-surface-soft hover:border-ink/30 hover:bg-surface",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-[0.875rem] font-medium text-ink">
                    {a.name}
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[0.6875rem] text-ink-muted">
                    {a.email}
                  </div>
                </div>
                <span className="shrink-0 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-faint transition-colors group-hover:text-ink-soft">
                  →
                </span>
              </div>
              <div className="mt-1.5 text-[0.6875rem] leading-snug text-ink-muted">
                {a.detail}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
