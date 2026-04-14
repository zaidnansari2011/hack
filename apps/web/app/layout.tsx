import type { Metadata } from "next"
import { Manrope, Sora } from "next/font/google"

import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { SmoothScroll } from "@/components/layout/smooth-scroll"

import "./globals.css"

const manrope = Manrope({ subsets: ["latin"], variable: "--font-body" })
const sora = Sora({ subsets: ["latin"], variable: "--font-heading" })

export const metadata: Metadata = {
  title: "Proof-of-Learn | Verifiable Learning Rewards",
  description: "A professional proof-of-learning platform with AI tutoring, anti-cheat verification, and guaranteed USDC payouts.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${sora.variable}`}>
        <SmoothScroll />
        <div className="flex min-h-screen flex-col bg-background text-foreground">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  )
}
