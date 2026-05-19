"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// Creating a bounty is a modal on the dashboard now. This route is kept
// only so old links/bookmarks don't 404 — it bounces to the dashboard with
// ?new=1 so the modal opens automatically.
export default function NewBountyRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/dashboard?new=1")
  }, [router])
  return (
    <div className="grid min-h-[40vh] place-items-center text-[0.875rem] text-ink-muted">
      Opening new bounty…
    </div>
  )
}
