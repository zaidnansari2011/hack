import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Find verified talent · EduPay",
  description:
    "Search for learners who passed a curriculum on EduPay. Every score on this list is committed on-chain — resumes lie, receipts don't.",
}

export default function RecruitLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
