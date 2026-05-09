import { randomBytes } from "node:crypto"

import { env } from "@/config/env"
import { logger } from "@/config/logger"
import { ExternalServiceError } from "@/lib/errors"

export type CreatePayoutInput = {
  amountInr: number
  upiId: string
  idempotencyKey: string
  reference: string
}

export type CreatePayoutResult = {
  razorpayPayoutId: string
  status: "processing" | "sent" | "failed"
  simulated: boolean
}

export const payoutMode: "live" | "simulated" = env.PAYOUT_SIMULATION
  ? "simulated"
  : Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET)
    ? "live"
    : "simulated"

function fakeRazorpayId(): string {
  return `pout_${randomBytes(8).toString("hex")}`
}

/**
 * Create a Razorpay X UPI payout. In simulation mode we just fabricate a
 * plausible response — the demo flow doesn't move real money. Live mode is
 * scaffolded behind the same signature so swapping in real credentials is a
 * one-line env change.
 */
export async function createPayout(
  input: CreatePayoutInput,
): Promise<CreatePayoutResult> {
  if (payoutMode === "simulated") {
    const id = fakeRazorpayId()
    logger.info(
      { id, amountInr: input.amountInr, upi: input.upiId, key: input.idempotencyKey },
      "[payout:sim] created",
    )
    return { razorpayPayoutId: id, status: "processing", simulated: true }
  }

  // Live path — Razorpay X UPI payout.
  // POST /v1/payouts on api.razorpay.com using basic auth (key:secret).
  // Production would resolve `fund_account_id` for the UPI VPA via
  // /v1/contacts + /v1/fund_accounts; we collapse that here for brevity.
  const auth = Buffer.from(
    `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`,
  ).toString("base64")

  const res = await fetch("https://api.razorpay.com/v1/payouts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Payout-Idempotency": input.idempotencyKey,
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      account_number: env.RAZORPAY_KEY_ID, // placeholder — real impl uses RZP X virtual account
      amount: input.amountInr * 100,
      currency: "INR",
      mode: "UPI",
      purpose: "payout",
      queue_if_low_balance: true,
      reference_id: input.reference,
      narration: "Proof-of-Learn reward",
      // fund_account / contact would be wired from a pre-onboarded recipient.
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    logger.error({ status: res.status, body: text.slice(0, 400) }, "razorpay error")
    throw ExternalServiceError(`Razorpay returned ${res.status}`, text.slice(0, 200))
  }

  const json = (await res.json()) as { id: string; status: string }
  return {
    razorpayPayoutId: json.id,
    status:
      json.status === "processed" || json.status === "sent"
        ? "sent"
        : json.status === "failed"
          ? "failed"
          : "processing",
    simulated: false,
  }
}
