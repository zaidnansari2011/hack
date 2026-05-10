"use client"

import { QRCodeSVG } from "qrcode.react"
import { useState } from "react"

import { generateCertificatePdf } from "@/lib/certificate-pdf"
import type { VerifiedCredential } from "@pol/shared"

/**
 * QR + share + download surface used on /verify and on the celebration
 * page. The QR encodes the canonical verify URL so anyone can scan and
 * audit on a phone — no app, no login.
 */
export function CredentialShareCard({
  cred,
  showDownload = true,
}: {
  cred: VerifiedCredential
  showDownload?: boolean
}) {
  const verifyUrl = useVerifyUrl(cred.txHash)
  const shareText = `${cred.studentInitials} passed ${cred.curriculum.title} (${cred.scorePct}%), verified on-chain · ${verifyUrl}`

  const [copyState, setCopyState] = useState<"idle" | "ok" | "err">("idle")
  const [pdfState, setPdfState] = useState<"idle" | "working" | "err">("idle")

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopyState("ok")
      setTimeout(() => setCopyState("idle"), 2000)
    } catch {
      setCopyState("err")
      setTimeout(() => setCopyState("idle"), 2000)
    }
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: `${cred.curriculum.title} · Proof-of-Learn`,
          text: shareText,
          url: verifyUrl,
        })
      } catch {
        // user dismissed
      }
    } else {
      copyShare()
    }
  }

  async function download() {
    if (pdfState === "working") return
    setPdfState("working")
    try {
      await generateCertificatePdf({ cred, verifyUrl })
      setPdfState("idle")
    } catch (e) {
      console.error(e)
      setPdfState("err")
      setTimeout(() => setPdfState("idle"), 2500)
    }
  }

  return (
    <section>
      <div className="eyebrow eyebrow-tick mb-4 text-[0.625rem]">Share</div>
      <div className="grid gap-px overflow-hidden rounded-md border border-rule bg-rule sm:grid-cols-[auto_1fr]">
        <div className="grid place-items-center bg-paper p-6">
          <div className="rounded-md border border-rule bg-paper p-3">
            <QRCodeSVG
              value={verifyUrl}
              size={148}
              bgColor="transparent"
              fgColor="#0f1419"
              level="M"
              marginSize={0}
            />
          </div>
        </div>
        <div className="flex flex-col justify-between gap-4 bg-paper p-6">
          <div>
            <div className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-ink-faint">
              Scan to verify
            </div>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-soft">
              Anyone with this QR or link can audit the score, on-chain
              receipt, and cryptographic commitments below. No login needed.
            </p>
            <div className="mt-3 break-all rounded border border-rule bg-surface-soft px-3 py-2 font-mono text-[0.6875rem] text-ink-muted">
              {verifyUrl}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={nativeShare}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[0.8125rem] font-medium text-paper transition-colors hover:bg-ink/90"
            >
              <ShareIcon className="h-3.5 w-3.5" />
              Share
            </button>
            <button
              type="button"
              onClick={copyShare}
              className="inline-flex items-center gap-2 rounded-full border border-rule bg-paper px-4 py-2 text-[0.8125rem] font-medium text-ink-soft transition-colors hover:border-ink/40 hover:text-ink"
            >
              {copyState === "ok"
                ? "Copied"
                : copyState === "err"
                  ? "Copy failed"
                  : "Copy link"}
            </button>
            {showDownload && (
              <button
                type="button"
                onClick={download}
                disabled={pdfState === "working"}
                className="inline-flex items-center gap-2 rounded-full border border-rule bg-paper px-4 py-2 text-[0.8125rem] font-medium text-ink-soft transition-colors hover:border-ink/40 hover:text-ink disabled:opacity-60"
              >
                <DownloadIcon className="h-3.5 w-3.5" />
                {pdfState === "working"
                  ? "Generating…"
                  : pdfState === "err"
                    ? "Failed. Try again."
                    : "Certificate PDF"}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function useVerifyUrl(txHash: string): string {
  if (typeof window === "undefined") return `/verify/${txHash}`
  return `${window.location.origin}/verify/${txHash}`
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="17" cy="6" r="2.5" />
      <circle cx="17" cy="18" r="2.5" />
      <path d="M8.5 11l6.5-3.5" />
      <path d="M8.5 13l6.5 3.5" />
    </svg>
  )
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 4v12" />
      <path d="M7 11l5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  )
}
