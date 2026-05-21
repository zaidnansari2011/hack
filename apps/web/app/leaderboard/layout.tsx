import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Leaderboard · EduPay",
  description:
    "Top learners and top sponsors on EduPay. Every rank is backed by an on-chain credential — resumes lie, receipts don't.",
}

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
