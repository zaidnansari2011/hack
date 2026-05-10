import type { Metadata } from "next"
import { Fraunces, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google"

import { AppShell } from "@/components/layout/app-shell"

import "./globals.css"

// Fraunces: variable font with opsz + SOFT axes. SOFT at high values gives
// rounded, gentle letterforms — far less sharp than the default.
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz", "SOFT"],
  weight: "variable",
  style: ["normal", "italic"],
})

const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "600", "700"],
})

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
})

export const metadata: Metadata = {
  title: "Proof-of-Learn: Sponsor-funded learning, settled in seconds",
  description:
    "An editorial-grade proof-of-learning protocol. Sponsors deposit USDC into escrow on Base; students learn with an AI tutor; verified completions settle in INR over UPI in seconds.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="bg-paper text-ink antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
