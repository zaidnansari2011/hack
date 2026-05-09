"use client"

import jsPDF from "jspdf"
import type { VerifiedCredential } from "@pol/shared"

/**
 * Generates an A4-portrait certificate PDF for a verified credential.
 * Uses jsPDF — pure-canvas, no fonts beyond the built-in Helvetica family,
 * so it ships with zero font assets and renders identically across
 * browsers. The QR is rendered into a temporary canvas via a separate
 * helper so we can embed it as a PNG.
 */
export async function generateCertificatePdf(args: {
  cred: VerifiedCredential
  verifyUrl: string
}): Promise<void> {
  const { cred, verifyUrl } = args
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" })

  // ── Constants — A4 is 210x297mm. Layout coords in mm.
  const W = 210
  const margin = 16
  const inkGray: [number, number, number] = [22, 27, 34]
  const teal: [number, number, number] = [21, 132, 130]
  const muted: [number, number, number] = [115, 122, 130]
  const ruleColor: [number, number, number] = [220, 220, 215]

  // ── Border frame
  doc.setDrawColor(...ruleColor)
  doc.setLineWidth(0.4)
  doc.rect(margin / 2, margin / 2, W - margin, 297 - margin)
  doc.setLineWidth(0.15)
  doc.rect(margin / 2 + 2, margin / 2 + 2, W - margin - 4, 297 - margin - 4)

  // ── Header
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...inkGray)
  doc.setFontSize(11)
  doc.text("PROOF-OF-LEARN", margin, margin + 6)

  doc.setFont("helvetica", "normal")
  doc.setTextColor(...muted)
  doc.setFontSize(8)
  doc.text(cred.chain.network.toUpperCase(), W - margin, margin + 6, {
    align: "right",
  })

  // ── Eyebrow
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...teal)
  doc.setFontSize(8)
  doc.text("VERIFIED CREDENTIAL · ON-CHAIN", margin, margin + 22)

  // ── Title block
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...inkGray)
  doc.setFontSize(28)
  doc.text("Certificate of Completion", margin, margin + 38)

  doc.setFontSize(10)
  doc.setTextColor(...muted)
  doc.text(
    "This document certifies that the holder below passed a proctored,",
    margin,
    margin + 48,
  )
  doc.text(
    "time-locked assessment and was paid in INR upon verification.",
    margin,
    margin + 53,
  )

  // ── Recipient
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...inkGray)
  doc.setFontSize(20)
  doc.text(cred.studentInitials || "Anon", margin, margin + 75)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(...muted)
  doc.text("Recipient (initials)", margin, margin + 81)

  // ── Curriculum
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...teal)
  doc.setFontSize(16)
  doc.text(cred.curriculum.title, margin, margin + 100)

  doc.setFont("helvetica", "normal")
  doc.setTextColor(...muted)
  doc.setFontSize(9)
  const summaryLines = doc.splitTextToSize(
    cred.curriculum.summary,
    W - margin * 2,
  )
  doc.text(summaryLines.slice(0, 3), margin, margin + 108)

  // ── Stats row (score · reward · date)
  const statsY = margin + 132
  doc.setDrawColor(...ruleColor)
  doc.line(margin, statsY - 6, W - margin, statsY - 6)

  const statW = (W - margin * 2) / 3
  drawStat(doc, margin, statsY, "SCORE", `${cred.scorePct}%`, teal, inkGray, muted)
  drawStat(
    doc,
    margin + statW,
    statsY,
    "REWARD",
    `Rs ${cred.bounty.rewardInr.toLocaleString("en-IN")}`,
    inkGray,
    inkGray,
    muted,
  )
  drawStat(
    doc,
    margin + statW * 2,
    statsY,
    "VERIFIED",
    cred.passedAt
      ? new Date(cred.passedAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—",
    inkGray,
    inkGray,
    muted,
  )

  doc.line(margin, statsY + 18, W - margin, statsY + 18)

  // ── Bounty / sponsor
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...inkGray)
  doc.setFontSize(10)
  doc.text("Sponsored by", margin, margin + 165)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...muted)
  doc.text(
    `${cred.bounty.sponsorName}  ·  ${cred.bounty.title}`,
    margin + 32,
    margin + 165,
  )

  // ── Cryptographic commitments
  const cryptoY = margin + 180
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...inkGray)
  doc.setFontSize(8)
  doc.text("CRYPTOGRAPHIC COMMITMENTS", margin, cryptoY)

  doc.setFont("courier", "normal")
  doc.setTextColor(...muted)
  doc.setFontSize(7)
  doc.text(`tx hash       ${cred.txHash}`, margin, cryptoY + 7)
  doc.text(`score hash    ${cred.scoreHash}`, margin, cryptoY + 12)
  doc.text(`commitment    ${cred.commitment}`, margin, cryptoY + 17)
  if (cred.studentAddress) {
    doc.text(`address       ${cred.studentAddress}`, margin, cryptoY + 22)
  }
  if (cred.tokenId) {
    doc.text(`SBT token     #${cred.tokenId}`, margin, cryptoY + 27)
  }

  // ── QR + verify URL
  const qrY = margin + 222
  try {
    const qrPng = await generateQrDataUrl(verifyUrl, 256)
    doc.addImage(qrPng, "PNG", margin, qrY, 30, 30)
  } catch {
    // QR generation failed — skip the image, the URL is still printed below.
  }

  doc.setFont("helvetica", "bold")
  doc.setTextColor(...inkGray)
  doc.setFontSize(8)
  doc.text("VERIFY THIS CERTIFICATE", margin + 36, qrY + 6)

  doc.setFont("helvetica", "normal")
  doc.setTextColor(...muted)
  doc.setFontSize(8)
  doc.text(
    "Scan the QR or visit the URL below — the page reads the same",
    margin + 36,
    qrY + 12,
  )
  doc.text(
    "credential record live from the on-chain ledger.",
    margin + 36,
    qrY + 16,
  )

  doc.setFont("courier", "normal")
  doc.setTextColor(...inkGray)
  doc.setFontSize(8)
  doc.text(verifyUrl, margin + 36, qrY + 24)

  // ── Footer
  doc.setDrawColor(...ruleColor)
  doc.line(margin, 297 - margin - 8, W - margin, 297 - margin - 8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...muted)
  doc.setFontSize(7)
  doc.text(
    "Issued by Proof-of-Learn — sponsor-funded learning, settled in seconds.",
    margin,
    297 - margin - 3,
  )
  doc.text("proof-of-learn.io", W - margin, 297 - margin - 3, { align: "right" })

  doc.save(
    `proof-of-learn-${cred.curriculum.slug}-${cred.txHash.slice(0, 10)}.pdf`,
  )
}

function drawStat(
  doc: jsPDF,
  x: number,
  y: number,
  label: string,
  value: string,
  valueColor: [number, number, number],
  inkColor: [number, number, number],
  muted: [number, number, number],
) {
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...muted)
  doc.setFontSize(7)
  doc.text(label, x, y)

  doc.setFont("helvetica", "bold")
  doc.setTextColor(...valueColor)
  doc.setFontSize(18)
  doc.text(value, x, y + 9)
}

/**
 * Render a QR code to a PNG data URL via a hidden canvas. We avoid
 * pulling another dependency by using qrcode.react's own canvas
 * variant, but that requires a DOM mount. Doing it manually with a
 * tiny QR encoder would also work; for now we lean on the library by
 * mounting an invisible component, then reading toDataURL.
 */
async function generateQrDataUrl(value: string, size: number): Promise<string> {
  // Lazy import so jspdf path stays the only build-time dep on the
  // certificate page.
  const { QRCodeCanvas } = await import("qrcode.react")
  const { createRoot } = await import("react-dom/client")
  const { createElement } = await import("react")

  return new Promise((resolve, reject) => {
    const host = document.createElement("div")
    host.style.position = "fixed"
    host.style.left = "-10000px"
    host.style.top = "-10000px"
    document.body.appendChild(host)

    const root = createRoot(host)
    root.render(
      createElement(QRCodeCanvas, {
        value,
        size,
        level: "M",
        marginSize: 0,
      }),
    )

    // Wait one frame for the canvas to mount.
    requestAnimationFrame(() => {
      const canvas = host.querySelector("canvas") as HTMLCanvasElement | null
      if (!canvas) {
        cleanup()
        reject(new Error("QR canvas not found"))
        return
      }
      try {
        const url = canvas.toDataURL("image/png")
        cleanup()
        resolve(url)
      } catch (err) {
        cleanup()
        reject(err)
      }
    })

    function cleanup() {
      try {
        root.unmount()
      } catch {
        // ignore
      }
      host.remove()
    }
  })
}
