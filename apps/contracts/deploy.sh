#!/usr/bin/env bash
# Deploy ProofOfLearnEscrow + LearnCredential to Base Sepolia and write the
# resulting contract addresses back into ../../.env.local so the API flips
# from simulated to live mode automatically. The script also funds the
# seeded "Acme Rust" bounty on-chain so the judges' demo runs end-to-end.
#
# Prereqs:
#   1. forge installed (`foundryup`)
#   2. .env.local at the repo root with DEPLOYER_PRIVATE_KEY, CHAIN_RPC_URL,
#      BASESCAN_API_KEY (verify only)
#   3. The deployer address has enough Base Sepolia ETH (~0.04 ETH covers
#      both contract deployments + the 0.025 ETH demo-bounty escrow + gas)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$REPO_ROOT/.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ .env.local not found at $ENV_FILE" >&2
  exit 1
fi

# Load env without echoing values
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${DEPLOYER_PRIVATE_KEY:?must be set in .env.local}"
: "${CHAIN_RPC_URL:?must be set in .env.local}"

# Verify funds before broadcasting (fail fast if faucet hasn't landed).
DEPLOYER_ADDRESS="$(cast wallet address --private-key "$DEPLOYER_PRIVATE_KEY")"
BALANCE_WEI="$(cast balance --rpc-url "$CHAIN_RPC_URL" "$DEPLOYER_ADDRESS")"
echo "Deployer: $DEPLOYER_ADDRESS"
echo "Balance:  $BALANCE_WEI wei"

if [[ "$BALANCE_WEI" == "0" ]]; then
  echo "❌ Deployer has 0 balance on Base Sepolia. Fund it first:" >&2
  echo "   https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet" >&2
  echo "   https://www.alchemy.com/faucets/base-sepolia" >&2
  echo "   https://faucet.quicknode.com/base/sepolia" >&2
  exit 1
fi

# 0.04 ETH is what we need: ~0.005 deploy + 0.025 demo bounty deposit + slack.
MIN_BALANCE_WEI="40000000000000000"
if [[ $(echo "$BALANCE_WEI $MIN_BALANCE_WEI" | awk '{print ($1 < $2)}') == "1" ]]; then
  echo "⚠  Deployer balance is below 0.04 ETH. Deployment may still fit but"
  echo "   the demo-bounty deposit (0.025 ETH) might fail. Top up if uncertain."
fi

cd "$REPO_ROOT/apps/contracts"

echo "→ Compiling…"
forge build > /dev/null

echo "→ Running tests…"
forge test --silent

echo "→ Deploying to Base Sepolia…"
# NOTE: don't use --silent — it suppresses console2.log lines that we grep
# for the deployed addresses below. We pipe to a tempfile so the script
# stays quiet on success but we can still parse the log lines.
DEPLOY_LOG="$(mktemp)"
forge script script/Deploy.s.sol \
  --rpc-url "$CHAIN_RPC_URL" \
  --private-key "$DEPLOYER_PRIVATE_KEY" \
  --broadcast > "$DEPLOY_LOG" 2>&1
DEPLOY_OUTPUT="$(cat "$DEPLOY_LOG")"
rm -f "$DEPLOY_LOG"

# Match both `ESCROW_CONTRACT_ADDRESS= 0x...` (forge ≤1.0) and `0x...` on the
# next line (forge ≥1.1 sometimes wraps the value). The trailing | head -1
# guards against duplicate matches when the script runs in --tracing mode.
ESCROW="$(echo "$DEPLOY_OUTPUT" | grep -oE 'ESCROW_CONTRACT_ADDRESS=[[:space:]]*0x[a-fA-F0-9]{40}' | grep -oE '0x[a-fA-F0-9]{40}' | head -1)"
CREDENTIAL="$(echo "$DEPLOY_OUTPUT" | grep -oE 'CREDENTIAL_CONTRACT_ADDRESS=[[:space:]]*0x[a-fA-F0-9]{40}' | grep -oE '0x[a-fA-F0-9]{40}' | head -1)"

if [[ -z "$ESCROW" || -z "$CREDENTIAL" ]]; then
  echo "❌ Could not parse deployed addresses from forge output:" >&2
  echo "$DEPLOY_OUTPUT" | tail -30 >&2
  exit 1
fi

echo "✅ Deployed:"
echo "   ESCROW_CONTRACT_ADDRESS=$ESCROW"
echo "   CREDENTIAL_CONTRACT_ADDRESS=$CREDENTIAL"

# Patch .env.local in place. Adds the keys if missing, replaces if present.
patch_env() {
  local key="$1" value="$2" file="$3"
  if grep -qE "^${key}=" "$file"; then
    # Use a sed-safe delimiter (|) since addresses contain no |.
    sed -i.bak "s|^${key}=.*|${key}=${value}|" "$file"
    rm -f "${file}.bak"
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$file"
  fi
}

patch_env "ESCROW_CONTRACT_ADDRESS" "$ESCROW" "$ENV_FILE"
patch_env "CREDENTIAL_CONTRACT_ADDRESS" "$CREDENTIAL" "$ENV_FILE"

# The API reads from apps/api/.env, not the repo-root .env.local. Mirror the
# chain config across so a single deploy makes everything live — no manual
# copy step. We propagate the same five keys that flip chainMode to "live".
API_ENV_FILE="$REPO_ROOT/apps/api/.env"
if [[ -f "$API_ENV_FILE" ]]; then
  patch_env "CHAIN_RPC_URL" "$CHAIN_RPC_URL" "$API_ENV_FILE"
  patch_env "CHAIN_ID" "${CHAIN_ID:-84532}" "$API_ENV_FILE"
  patch_env "DEPLOYER_PRIVATE_KEY" "$DEPLOYER_PRIVATE_KEY" "$API_ENV_FILE"
  patch_env "ESCROW_CONTRACT_ADDRESS" "$ESCROW" "$API_ENV_FILE"
  patch_env "CREDENTIAL_CONTRACT_ADDRESS" "$CREDENTIAL" "$API_ENV_FILE"
  echo "✅ apps/api/.env mirrored — API will pick up live chain mode on next restart."
else
  echo "⚠  apps/api/.env not found — copy chain vars from .env.local manually."
fi

echo "✅ .env.local updated. Restart the API to pick up live chain mode."
echo "   Escrow:     https://sepolia.basescan.org/address/$ESCROW"
echo "   Credential: https://sepolia.basescan.org/address/$CREDENTIAL"
echo
echo "Demo bounty (Acme Rust, id 00000000-0000-0000-0000-000000000001) is now"
echo "funded on-chain for up to 10 verified completions. Each demo run will:"
echo "  1. releasePayout() on the escrow → sends 0.0025 ETH to the student"
echo "  2. mint() on the credential contract → soulbound SBT to the same address"
echo "Both txs will appear on BaseScan, visible to the judges live."
