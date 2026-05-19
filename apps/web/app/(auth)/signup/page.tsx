"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { AuthResponse, UserRole } from "@pol/shared"

import { ApiClientError, apiFetch } from "@/lib/api"
import { authStore } from "@/lib/auth-store"
import { AuthCard } from "@/components/auth/auth-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const ROLES: { value: UserRole; label: string; copy: string }[] = [
  {
    value: "sponsor",
    label: "Sponsor",
    copy: "Back learners you believe in. Pay only when they prove it.",
  },
  {
    value: "student",
    label: "Student",
    copy: "Study a curriculum, pass the quiz, earn rupees.",
  },
]

export default function SignupPage() {
  const router = useRouter()
  const [role, setRole] = useState<UserRole>("sponsor")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const data = await apiFetch<AuthResponse>("/auth/signup", {
        method: "POST",
        token: null,
        json: { name, email, password, role },
      })
      authStore.set(data.user, data.token)
      router.push(role === "sponsor" ? "/dashboard" : "/learn")
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
      title="Create your account"
      subtitle="Let's get you started. Tell us how you'll use EduPay."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-ink underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-6" onSubmit={onSubmit}>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-rule bg-rule">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              className={cn(
                "group relative bg-surface p-4 text-left transition-all duration-300 ease-out-quart",
                role === r.value
                  ? "bg-teal-tint"
                  : "hover:bg-surface-soft",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ink-faint">
                  {r.value === "sponsor" ? "01" : "02"}
                </span>
                <span
                  className={cn(
                    "h-2 w-2 rounded-full transition-colors",
                    role === r.value ? "bg-teal" : "bg-rule",
                  )}
                />
              </div>
              <div className="mt-3 font-display text-[1.0625rem] font-medium text-ink">
                {r.label}
              </div>
              <div className="mt-1 text-[0.75rem] leading-relaxed text-ink-muted">
                {r.copy}
              </div>
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="name">{role === "sponsor" ? "Organization" : "Full name"}</Label>
          <Input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={role === "sponsor" ? "Acme Foundation" : "Aarav Sharma"}
          />
        </div>
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
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>

        {error && (
          <div className="border-l-2 border-terracotta bg-terracotta/5 px-4 py-2.5 text-[0.8125rem] text-terracotta">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating account…" : `Create ${role} account`}
        </Button>
      </form>
    </AuthCard>
  )
}
