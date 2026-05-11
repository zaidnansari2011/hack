import { Nunito } from "next/font/google"

import { StudentShell } from "@/components/student/student-shell"

// Softer, rounder typeface used only within the student route group.
// Overrides --font-body and --font-display in this subtree so every
// Tailwind `font-display` / default body text becomes easier to read.
const soft = Nunito({
  subsets: ["latin"],
  variable: "--font-soft",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
})

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className={soft.variable}
      style={
        {
          "--font-body": "var(--font-soft)",
          "--font-display": "var(--font-soft)",
          fontFamily: "var(--font-soft)",
        } as React.CSSProperties
      }
    >
      <StudentShell>{children}</StudentShell>
    </div>
  )
}
