#!/usr/bin/env bash
# Deploy ProofOfLearnEscrow + LearnCredential to Base Sepolia and write the
# resulting contract addresses back into ../../.env.local so the API flips
# from simulated to live mode automatically.
#
# Prereqs:
#   1. forge installed (`foundryup`)
#   2. .env.local at the repo root with DEPLOYER_PRIVATE_KEY, CHAIN_RPC_URL,
#      BASESCAN_API_KEY (verify only)
#   3. The deployer address has enough Base Sepolia ETH (~0.005 ETH covers
#      both contract deployments)

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
  echo "   https://www.alchemy.com/faucets/base-sepolia" >&2
  echo "   https://faucet.quicknode.com/base/sepolia" >&2
  exit 1
fi

cd "$REPO_ROOT/apps/contracts"

echo "→ Compiling…"
forge build > /dev/null

echo "→ Running tests…"
forge test --silent

echo "→ Deploying to Base Sepolia…"
DEPLOY_OUTPUT="$(forge script script/Deploy.s.sol \
  --rpc-url "$CHAIN_RPC_URL" \
  --private-key "$DEPLOYER_PRIVATE_KEY" \
  --broadcast \
  --silent)"

# The Deploy script logs `ESCROW_CONTRACT_ADDRESS=` and `CREDENTIAL_CONTRACT_ADDRESS=`
ESCROW="$(echo "$DEPLOY_OUTPUT" | grep -Eo 'ESCROW_CONTRACT_ADDRESS= 0x[a-fA-F0-9]{40}' | awk '{print $2}')"
CREDENTIAL="$(echo "$DEPLOY_OUTPUT" | grep -Eo 'CREDENTIAL_CONTRACT_ADDRESS= 0x[a-fA-F0-9]{40}' | awk '{print $2}')"

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

echo "✅ .env.local updated. Restart the API to pick up live chain mode."
echo "   Escrow:     https://sepolia.basescan.org/address/$ESCROW"
echo "   Credential: https://sepolia.basescan.org/address/$CREDENTIAL"
