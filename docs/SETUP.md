# Development Setup Guide

## Prerequisites

Ensure the following are installed before proceeding:

| Tool | Version | Purpose | Install |
|------|---------|---------|---------|
| Node.js | >= 20.x | Runtime | https://nodejs.org or `nvm install 20` |
| pnpm | >= 9.x | Package manager | `npm install -g pnpm` |
| Docker Desktop | Latest | PostgreSQL, Redis, RAGFlow | https://docker.com |
| Git | >= 2.x | Version control | https://git-scm.com |
| Foundry | Latest | Smart contract toolchain | `curl -L https://foundry.paradigm.xyz \| bash && foundryup` |

### Optional (but recommended)

| Tool | Purpose |
|------|---------|
| VS Code | IDE with recommended extensions |
| Postman / Bruno | API testing |
| Base Sepolia faucet | Get testnet ETH for contract deployment |

---

## Step 1: Clone and Install

```bash
git clone <repo-url>
cd proof-of-learn
pnpm install
```

This installs dependencies for all workspaces: `apps/web`, `apps/api`, `apps/contracts`, and `packages/*`.

---

## Step 2: Environment Variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the required values:

```env
# ── Database ──────────────────────────────────────────
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/proofoflearn

# ── Redis ─────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ── Dify ──────────────────────────────────────────────
DIFY_API_BASE_URL=http://localhost/v1       # Or your Dify cloud URL
DIFY_API_KEY=app-xxxxxxxxxxxx               # From Dify dashboard > API Access
DIFY_TUTOR_WORKFLOW_ID=                     # Workflow ID for the tutor agent
DIFY_QUIZ_WORKFLOW_ID=                      # Workflow ID for quiz generation

# ── RAGFlow ───────────────────────────────────────────
RAGFLOW_API_URL=http://localhost:9380
RAGFLOW_API_KEY=                            # From RAGFlow dashboard

# ── Circle ────────────────────────────────────────────
CIRCLE_API_KEY=                             # From Circle developer console
CIRCLE_ENTITY_SECRET=                       # Encrypted entity secret for wallet ops
CIRCLE_WALLET_SET_ID=                       # Wallet set ID for student wallets

# ── Blockchain ────────────────────────────────────────
CHAIN_RPC_URL=https://sepolia.base.org      # Base Sepolia testnet
DEPLOYER_PRIVATE_KEY=                       # Private key for contract deployment (NEVER commit)
ESCROW_CONTRACT_ADDRESS=                    # Filled after deployment

# ── Auth ──────────────────────────────────────────────
JWT_SECRET=your-secret-here-change-in-prod  # Min 32 chars
JWT_EXPIRY=7d

# ── App ───────────────────────────────────────────────
NODE_ENV=development
API_PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── Webhooks (ngrok for local dev) ────────────────────
WEBHOOK_BASE_URL=https://your-ngrok-url.ngrok.io
WEBHOOK_SECRET=your-webhook-signing-secret
```

### Getting API Keys

#### Dify
1. Go to https://cloud.dify.ai (or self-host via Docker)
2. Create a new workspace
3. Build the tutor workflow (see `dify/workflows/` for templates)
4. Go to **API Access** -> copy the API key
5. Note the workflow IDs from the URL

#### RAGFlow
1. Start RAGFlow via Docker Compose (included in our `docker-compose.yml`)
2. Access the dashboard at http://localhost:9380
3. Create a knowledge base, upload curriculum documents
4. Get the API key from **Settings** -> **API**

#### Circle
1. Sign up at https://console.circle.com
2. Create a new project
3. Go to **API Keys** -> generate a key
4. Set up a wallet set under **Programmable Wallets**
5. Generate and encrypt your entity secret (see Circle docs)

#### Base Sepolia Testnet
1. Get testnet ETH from https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
2. Generate a deployer wallet: `cast wallet new`
3. Fund it with testnet ETH
4. Add the private key to `.env.local`

---

## Step 3: Start Infrastructure

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** on port 5432
- **Redis** on port 6379
- **RAGFlow** on port 9380

Verify everything is running:
```bash
docker-compose ps
```

---

## Step 4: Database Setup

```bash
# Generate Prisma client
cd apps/api
pnpm prisma generate

# Run migrations
pnpm prisma migrate dev

# (Optional) Seed with sample data
pnpm prisma db seed
```

---

## Step 5: Deploy Smart Contracts (Testnet)

```bash
cd apps/contracts

# Build contracts
forge build

# Run tests
forge test

# Deploy to Base Sepolia
forge script script/Deploy.s.sol --rpc-url $CHAIN_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY --broadcast

# Copy the deployed contract address to .env.local
```

---

## Step 6: Start Development Servers

From the project root:

```bash
# Start everything in parallel
pnpm dev
```

This runs:
- **Next.js frontend** at http://localhost:3000
- **Express API** at http://localhost:3001

### For webhook development (Dify + Circle callbacks)

You need a public URL for webhooks to reach your local machine:

```bash
# Install ngrok
npm install -g ngrok

# Expose your API
ngrok http 3001

# Copy the https URL to WEBHOOK_BASE_URL in .env.local
# Register this URL in Dify and Circle dashboards
```

---

## Step 7: Upload Curriculum to RAGFlow

1. Open RAGFlow at http://localhost:9380
2. Create a knowledge base named after your curriculum (e.g., "rust-101")
3. Upload PDF/document files (NCERT textbooks, coding docs, etc.)
4. Configure parsing rules (use "Book" parser for textbooks, "General" for docs)
5. Wait for indexing to complete
6. Connect this knowledge base to your Dify workflow

---

## Step 8: Configure Dify Workflow

1. Open Dify at your configured URL
2. Import the workflow template from `dify/workflows/tutor-workflow.json`
3. Connect the RAGFlow knowledge base
4. Configure the webhook node to point to `$WEBHOOK_BASE_URL/webhooks/dify`
5. Test the workflow with a sample conversation

---

## Verification Checklist

Run through this after setup to confirm everything works:

- [ ] `pnpm dev` starts without errors
- [ ] http://localhost:3000 loads the frontend
- [ ] http://localhost:3001/health returns `{ status: "ok" }`
- [ ] `docker-compose ps` shows all containers running
- [ ] Prisma Studio (`pnpm prisma studio`) shows database tables
- [ ] RAGFlow dashboard loads at http://localhost:9380
- [ ] `forge test` passes all contract tests
- [ ] ngrok tunnel is active and webhook URL is configured

---

## Common Issues

### Port conflicts
```bash
# Check what's using a port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows
```

### Docker memory issues (RAGFlow is memory-hungry)
- Allocate at least 8GB RAM to Docker Desktop
- RAGFlow needs ~4GB on its own for document parsing

### Prisma migration issues
```bash
# Reset database (destructive — dev only)
pnpm prisma migrate reset

# Re-generate client after schema changes
pnpm prisma generate
```

### Foundry not found
```bash
# Reinstall
curl -L https://foundry.paradigm.xyz | bash
source ~/.bashrc  # or restart terminal
foundryup
```

---

## VS Code Recommended Extensions

Create `.vscode/extensions.json` (already included):
- `dbaeumer.vscode-eslint`
- `esbenp.prettier-vscode`
- `prisma.prisma`
- `JuanBlanco.solidity` (Solidity syntax + Foundry integration)
- `bradlc.vscode-tailwindcss`
- `ms-azuretools.vscode-docker`
