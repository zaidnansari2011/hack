"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import type { AuthResponse } from "@pol/shared"

import { ApiClientError, apiFetch } from "@/lib/api"
import { authStore } from "@/lib/auth-store"
import { AuthCard } from "@/components/auth/auth-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const QUICK_LOGINS = [
  { label: "Demo sponsor", email: "sponsor@demo.pol", password: "demo1234" },
  { label: "Demo student", email: "student@demo.pol", password: "demo1234" },
] as const

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

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      subtitle="Log in to fund bounties or continue your learning."
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
        <div className="eyebrow eyebrow-tick mb-3">Demo logins</div>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_LOGINS.map((q) => (
            <button
              key={q.email}
              type="button"
              className="group rounded-sm border border-rule bg-surface-soft px-3 py-2.5 text-left text-[0.75rem] font-medium text-ink-soft transition-all duration-300 ease-out-quart hover:border-ink/30 hover:bg-surface"
              onClick={() => {
                setEmail(q.email)
                setPassword(q.password)
                submit({ email: q.email, password: q.password })
              }}
              disabled={submitting}
            >
              <div className="font-display text-[0.875rem] font-medium text-ink">
                {q.label}
              </div>
              <div className="font-mono text-[0.6875rem] text-ink-faint">
                {q.email}
              </div>
            </button>
          ))}
        </div>
      </div>
    </AuthCard>
  )
}
