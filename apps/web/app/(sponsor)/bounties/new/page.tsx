"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// Creating a bounty is a modal on the dashboard now. This route is kept
// only so old links/bookmarks don't 404 — it bounces to the dashboard.
export default function NewBountyRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/dashboard")
  }, [router])
  return (
    <div className="grid min-h-[40vh] place-items-center text-[0.875rem] text-ink-muted">
      Taking you to the dashboard…
    </div>
  )
}
