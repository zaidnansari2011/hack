# Proof-of-Learn Contracts

Foundry workspace for the on-chain layer.

## Contracts

- **`ProofOfLearnEscrow.sol`** — sponsors deposit ETH/USDC into per-bounty buckets;
  the backend verifier releases per-student payouts and emits the
  `LearningVerified` event that serves as the public on-chain proof.
- **`LearnCredential.sol`** — soulbound (non-transferable) ERC-721 minted to a
  student wallet on quiz pass.

## Setup

```bash
# Install Foundry (one-time, in PowerShell):
#   iwr https://foundry.paradigm.xyz | iex; foundryup

forge install openzeppelin/openzeppelin-contracts --no-commit
forge install foundry-rs/forge-std --no-commit
forge build
forge test -vv
```

## Deploy to Base Sepolia

```bash
export DEPLOYER_PRIVATE_KEY=0x...
export CHAIN_RPC_URL=https://sepolia.base.org
export BASESCAN_API_KEY=...

forge script script/Deploy.s.sol \
  --rpc-url $CHAIN_RPC_URL \
  --broadcast \
  --verify
```

After deploy, copy the printed addresses into `.env.local`:

```
ESCROW_CONTRACT_ADDRESS=0x...
CREDENTIAL_CONTRACT_ADDRESS=0x...
```

The API auto-detects these and switches from simulation mode to real on-chain calls.
