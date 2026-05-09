import {
  createPublicClient,
  createWalletClient,
  encodePacked,
  http,
  keccak256,
  parseEther,
  toHex,
  type Address,
  type Hash,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { baseSepolia } from "viem/chains"
import { randomBytes } from "node:crypto"

import { env } from "@/config/env"
import { logger } from "@/config/logger"
import { escrowAbi, credentialAbi } from "./abis"

// ─── Mode detection ───────────────────────────────────────────────────────────
// Real on-chain mode requires: RPC URL, deployer key, and at least one of the
// contract addresses. Anything missing → simulation mode (deterministic-looking
// tx hashes so the demo works end-to-end without deployed contracts).
const REAL_CHAIN_AVAILABLE = Boolean(
  env.CHAIN_RPC_URL &&
    env.DEPLOYER_PRIVATE_KEY &&
    env.ESCROW_CONTRACT_ADDRESS,
)

export const chainMode: "live" | "simulated" = REAL_CHAIN_AVAILABLE
  ? "live"
  : "simulated"

// ─── viem clients (lazy) ──────────────────────────────────────────────────────
// viem's chain-narrowed client types don't compose cleanly with module-level
// caching, so we let inference flow from a factory and avoid declaring a shared
// `Clients` shape.
function buildClients() {
  const account = privateKeyToAccount(
    env.DEPLOYER_PRIVATE_KEY as `0x${string}`,
  )
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(env.CHAIN_RPC_URL),
  })
  const walletClient = createWalletClient({
    chain: baseSepolia,
    transport: http(env.CHAIN_RPC_URL),
    account,
  })
  return { account, publicClient, walletClient }
}

let cached: ReturnType<typeof buildClients> | null = null

function ensureClients() {
  if (!REAL_CHAIN_AVAILABLE) {
    throw new Error("chain-service called in non-live mode")
  }
  if (!cached) cached = buildClients()
  return cached
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function curriculumHash(slug: string): `0x${string}` {
  return keccak256(toHex(slug))
}

export function bountyIdHash(uuid: string): `0x${string}` {
  return keccak256(toHex(uuid))
}

export function scoreHash(
  studentId: string,
  scorePct: number,
  sessionId: string,
): `0x${string}` {
  return keccak256(
    encodePacked(
      ["string", "uint16", "string"],
      [studentId, scorePct, sessionId],
    ),
  )
}

/**
 * Commitment hash for a verified credential — a Pedersen-style binding of
 * (studentAddress, curriculumSlug, scorePct >= passThreshold). Anyone who
 * knows the original inputs can recompute and check this against on-chain
 * data; the inputs alone don't reveal exact answers. Stand-in for a real
 * Groth16 proof — same shape, same verification ergonomics, much smaller
 * surface area.
 */
export function commitmentHash(
  studentAddress: Address,
  curriculumSlug: string,
  passed: boolean,
): `0x${string}` {
  return keccak256(
    encodePacked(
      ["address", "string", "bool"],
      [studentAddress, curriculumSlug, passed],
    ),
  )
}

function fakeTxHash(): `0x${string}` {
  // 32-byte hex, looks like a real Base Sepolia tx hash on BaseScan.
  return `0x${randomBytes(32).toString("hex")}` as `0x${string}`
}

export function basescanTxUrl(hash: string): string {
  return `https://sepolia.basescan.org/tx/${hash}`
}

export function basescanAddressUrl(addr: string): string {
  return `https://sepolia.basescan.org/address/${addr}`
}

// ─── Public API ───────────────────────────────────────────────────────────────
export type DepositResult = {
  txHash: Hash
  bountyId: `0x${string}`
  simulated: boolean
}

/**
 * Fund an escrow bounty. In live mode the deployer funds it on the sponsor's
 * behalf (sponsors don't need wallets in the demo) — in simulation mode we just
 * fabricate a plausible tx hash.
 */
export async function depositBounty(args: {
  bountyUuid: string
  curriculumSlug: string
  rewardWeiPerStudent: bigint
  maxStudents: number
}): Promise<DepositResult> {
  const bountyId = bountyIdHash(args.bountyUuid)
  const cHash = curriculumHash(args.curriculumSlug)
  const totalDeposit = args.rewardWeiPerStudent * BigInt(args.maxStudents)

  if (chainMode === "simulated") {
    const txHash = fakeTxHash()
    logger.info(
      { bountyId, txHash, totalDeposit: totalDeposit.toString() },
      "[chain:sim] depositBounty",
    )
    return { txHash, bountyId, simulated: true }
  }

  const { walletClient, account } = ensureClients()
  const txHash = await walletClient.writeContract({
    chain: baseSepolia,
    account,
    address: env.ESCROW_CONTRACT_ADDRESS as Address,
    abi: escrowAbi,
    functionName: "depositBounty",
    args: [bountyId, cHash, args.rewardWeiPerStudent, BigInt(args.maxStudents)],
    value: totalDeposit,
  })
  return { txHash, bountyId, simulated: false }
}

export type PayoutResult = {
  txHash: Hash
  simulated: boolean
}

export async function releasePayout(args: {
  bountyUuid: string
  studentAddress: Address
  scoreHash: `0x${string}`
}): Promise<PayoutResult> {
  const bountyId = bountyIdHash(args.bountyUuid)

  if (chainMode === "simulated") {
    const txHash = fakeTxHash()
    logger.info({ bountyId, txHash, ...args }, "[chain:sim] releasePayout")
    return { txHash, simulated: true }
  }

  const { walletClient, account } = ensureClients()
  const txHash = await walletClient.writeContract({
    chain: baseSepolia,
    account,
    address: env.ESCROW_CONTRACT_ADDRESS as Address,
    abi: escrowAbi,
    functionName: "releasePayout",
    args: [bountyId, args.studentAddress, args.scoreHash],
  })
  return { txHash, simulated: false }
}

export type MintResult = {
  txHash: Hash
  tokenId: string
  simulated: boolean
}

export async function mintCredential(args: {
  studentAddress: Address
  curriculumSlug: string
  scorePct: number
  metadataUri: string
}): Promise<MintResult> {
  const cHash = curriculumHash(args.curriculumSlug)

  if (chainMode === "simulated") {
    const txHash = fakeTxHash()
    const tokenId = (Math.floor(Date.now() / 1000) % 1_000_000).toString()
    logger.info({ txHash, tokenId, ...args }, "[chain:sim] mintCredential")
    return { txHash, tokenId, simulated: true }
  }

  if (!env.CREDENTIAL_CONTRACT_ADDRESS) {
    throw new Error("CREDENTIAL_CONTRACT_ADDRESS not configured")
  }

  const { walletClient, publicClient, account } = ensureClients()
  const { request, result } = await publicClient.simulateContract({
    address: env.CREDENTIAL_CONTRACT_ADDRESS as Address,
    abi: credentialAbi,
    functionName: "mint",
    args: [
      args.studentAddress,
      cHash,
      args.scorePct,
      args.metadataUri,
    ],
    account,
  })
  const txHash = await walletClient.writeContract(request)
  return { txHash, tokenId: result.toString(), simulated: false }
}

// ─── Convenience: small INR→wei converter for the demo ────────────────────────
// We treat each INR as a small wei amount on testnet so that contract math has
// non-zero values. (Real USDC integration is left for post-hackathon.)
const WEI_PER_INR = parseEther("0.00001") // 10 micro-ETH per ₹1 — testnet only.

export function inrToWei(amountInr: number): bigint {
  return BigInt(amountInr) * WEI_PER_INR
}

export function summary(): {
  mode: typeof chainMode
  chainId: number | null
  escrowAddress: string | null
  credentialAddress: string | null
  rpcConfigured: boolean
} {
  return {
    mode: chainMode,
    chainId: env.CHAIN_ID ?? null,
    escrowAddress: env.ESCROW_CONTRACT_ADDRESS ?? null,
    credentialAddress: env.CREDENTIAL_CONTRACT_ADDRESS ?? null,
    rpcConfigured: Boolean(env.CHAIN_RPC_URL),
  }
}
