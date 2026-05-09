import "dotenv/config"
import { z } from "zod"

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().default(3001),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRY: z.string().default("7d"),

  WEB_APP_URL: z.string().url().default("http://localhost:3000"),

  // Optional services — server runs in degraded mode if missing.
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default("llama-3.1-70b-versatile"),
  OPENAI_API_KEY: z.string().optional(),

  DIFY_API_BASE_URL: z.string().url().optional(),
  DIFY_API_KEY: z.string().optional(),
  DIFY_TUTOR_WORKFLOW_ID: z.string().optional(),
  DIFY_QUIZ_WORKFLOW_ID: z.string().optional(),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  PAYOUT_SIMULATION: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),

  CHAIN_RPC_URL: z.string().url().optional(),
  CHAIN_ID: z.coerce.number().optional(),
  DEPLOYER_PRIVATE_KEY: z.string().optional(),
  ESCROW_CONTRACT_ADDRESS: z.string().optional(),
  CREDENTIAL_CONTRACT_ADDRESS: z.string().optional(),
  USDC_CONTRACT_ADDRESS: z.string().optional(),

  WEBHOOK_BASE_URL: z.string().url().optional(),
  WEBHOOK_SECRET: z.string().optional(),
})

const parsed = envSchema.safeParse({
  ...process.env,
  WEB_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? process.env.WEB_APP_URL,
})

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("❌ Invalid environment configuration:")
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
export type Env = typeof env
