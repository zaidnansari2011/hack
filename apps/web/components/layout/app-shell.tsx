"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

import { SiteFooter } from "./site-footer"
import { SiteHeader } from "./site-header"

// Matches /learn/<bountyId> exactly — no trailing quiz/result segments.
function isStudyRoute(pathname: string) {
  return /^\/learn\/[^/]+\/?$/.test(pathname)
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const study = isStudyRoute(pathname)

  if (study) {
    return <>{children}</>
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  )
}
