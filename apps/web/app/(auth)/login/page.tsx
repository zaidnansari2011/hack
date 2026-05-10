"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import type { AuthResponse } from "@pol/shared"

import { ApiClientError, apiFetch } from "@/lib/api"
import { authStore } from "@/lib/auth-store"
import { AuthCard } from "@/components/auth/auth-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Sample profiles wired into the seed — not labelled "demo" anywhere
// the user will see, since the framing is "continue with a sample
// profile" (production-feeling onboarding) rather than a developer hatch.
const SAMPLE_PROFILES = {
  student: {
    label: "Continue as a student",
    detail: "Pre-enrolled in 2 bounties · ₹0 earned",
    email: "student@demo.pol",
    password: "demo1234",
  },
  sponsor: {
    label: "Continue as a sponsor",
    detail: "Active bounty · 7 verified completions",
    email: "sponsor@demo.pol",
    password: "demo1234",
  },
} as const

type Role = keyof typeof SAMPLE_PROFILES

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
  const requestedRole = (params.get("role") as Role | null) ?? null

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If the visitor came in via a quick-access pill ("I want to learn"
  // → /login?role=student), prefill the sample profile so they can
  // sign in with one click.
  useEffect(() => {
    if (!requestedRole) return
    const profile = SAMPLE_PROFILES[requestedRole]
    if (!profile) return
    setEmail(profile.email)
    setPassword(profile.password)
  }, [requestedRole])

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
        next ??
        (data.user.role === "sponsor" ? "/dashboard" : "/learn")
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

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Good to see you again. Pick up right where you left off."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-semibold text-slate-900 underline-offset-4 hover:underline">
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

      <div className="mt-8">
        <div className="eyebrow eyebrow-tick mb-3 text-[0.625rem]">
          Sample profiles
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(Object.keys(SAMPLE_PROFILES) as Role[]).map((role) => {
            const p = SAMPLE_PROFILES[role]
            const isSuggested = requestedRole === role
            return (
              <button
                key={role}
                type="button"
                className={`group rounded-sm border px-3 py-2.5 text-left text-[0.75rem] font-medium transition-all duration-300 ease-out-quart ${
                  isSuggested
                    ? "border-teal/40 bg-teal-soft/40 text-ink"
                    : "border-rule bg-surface-soft text-ink-soft hover:border-ink/30 hover:bg-surface"
                }`}
                onClick={() => {
                  setEmail(p.email)
                  setPassword(p.password)
                  submit({ email: p.email, password: p.password })
                }}
                disabled={submitting}
              >
                <div className="font-display text-[0.875rem] font-medium text-ink">
                  {p.label}
                </div>
                <div className="mt-0.5 text-[0.6875rem] text-ink-muted">
                  {p.detail}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </AuthCard>
  )
}
