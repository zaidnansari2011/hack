import type { Metadata } from "next"
import { Fraunces, Geist, JetBrains_Mono } from "next/font/google"

import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"

import "./globals.css"

// Fraunces is a variable font; passing `weight: "variable"` is required
// before we can use the `axes` option (opsz + SOFT for the editorial feel).
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz", "SOFT"],
  weight: "variable",
  style: ["normal", "italic"],
})

const body = Geist({
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
  title: "Proof-of-Learn — Sponsor-funded learning, settled in seconds",
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
        <div className="relative flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  )
}
