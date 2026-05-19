import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sign in · EduPay",
  description:
    "Sign in to fund a bounty, learn with the AI tutor, or claim your earnings on EduPay.",
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-paper">{children}</div>
}
