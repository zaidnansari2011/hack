# API Specification

Base URL: `http://localhost:3001/api/v1`

All responses follow the envelope format:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

Error responses:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "BOUNTY_DEPLETED",
    "message": "This bounty has no remaining slots"
  }
}
```

---

## Authentication

### `POST /auth/register`

Create a new account. Automatically creates a Circle wallet for students.

**Request:**
```json
{
  "email": "student@example.com",
  "password": "securepassword",
  "name": "Priya Sharma",
  "role": "student"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_abc123",
      "email": "student@example.com",
      "name": "Priya Sharma",
      "role": "student",
      "wallet_address": "0x..."
    },
    "token": "eyJhbG..."
  }
}
```

**Side effects:** For `role: "student"`, triggers Circle wallet creation (async — wallet_address populated on Circle webhook callback).

### `POST /auth/login`

**Request:**
```json
{
  "email": "student@example.com",
  "password": "securepassword"
}
```

**Response:** Same shape as register.

### `GET /auth/me`

**Headers:** `Authorization: Bearer <token>`

Returns current user profile with wallet balance.

---

## Bounties (Sponsor Endpoints)

All sponsor endpoints require `Authorization` header with a sponsor-role JWT.

### `POST /bounties`

Create a new bounty program with USDC escrow.

**Request:**
```json
{
  "title": "Learn Rust Programming",
  "description": "Complete the Rust fundamentals curriculum and earn USDC",
  "curriculum_id": "cur_rust101",
  "reward_per_student": 2.00,
  "max_students": 10000,
  "total_deposit_usdc": 20000.00,
  "deadline": "2026-06-01T00:00:00Z",
  "requirements": {
    "min_quiz_score": 70,
    "required_lessons": 5
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bounty": {
      "id": "bty_xyz789",
      "status": "pending_deposit",
      "escrow_address": "0x...",
      "deposit_tx_hash": null,
      "remaining_slots": 10000,
      "created_at": "2026-04-11T10:00:00Z"
    }
  }
}
```

**Flow:** After creation, sponsor must deposit USDC to the escrow address. Status moves to `active` once deposit is confirmed on-chain.

### `GET /bounties`

List bounties. Supports filtering and pagination.

**Query params:**
- `status` — `active`, `pending_deposit`, `depleted`, `expired`
- `page`, `limit` — pagination (default: page=1, limit=20)

### `GET /bounties/:id`

Get bounty details including real-time stats.

**Response includes:**
```json
{
  "completions": 3421,
  "remaining_slots": 6579,
  "total_paid_usdc": 6842.00,
  "average_score": 82.5,
  "completion_rate": 0.68
}
```

### `POST /bounties/:id/deposit`

Trigger USDC deposit from sponsor's Circle wallet to escrow contract.

**Request:**
```json
{
  "amount_usdc": 20000.00
}
```

---

## Enrollments (Student Endpoints)

### `POST /enrollments`

Enroll in a bounty program.

**Request:**
```json
{
  "bounty_id": "bty_xyz789"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "enrollment": {
      "id": "enr_001",
      "bounty_id": "bty_xyz789",
      "status": "active",
      "progress": {
        "lessons_completed": 0,
        "lessons_total": 5,
        "quiz_attempts": 0,
        "best_score": null
      }
    }
  }
}
```

**Validation:**
- Student can't enroll in the same bounty twice
- Bounty must have remaining slots
- Bounty must not be expired

### `GET /enrollments`

List student's active and completed enrollments.

### `GET /enrollments/:id`

Get detailed progress for a specific enrollment.

---

## Learning (AI Tutor)

### `POST /learn/chat`

Send a message to the AI tutor within an enrollment context.

**Request:**
```json
{
  "enrollment_id": "enr_001",
  "message": "Can you explain ownership in Rust?",
  "lesson_index": 2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "Great question! In Rust, ownership is a set of rules...",
    "sources": [
      {
        "document": "rust-programming-ncert.pdf",
        "page": 45,
        "chunk": "Ownership rules: 1. Each value has an owner..."
      }
    ],
    "lesson_progress": {
      "current_lesson": 2,
      "completed": false,
      "ready_for_quiz": false
    }
  }
}
```

**Notes:**
- Streams via SSE if `Accept: text/event-stream` header is present
- Each message is scoped to the enrollment's curriculum (RAGFlow retrieves from the correct knowledge base)
- The `sources` field shows which curriculum documents the AI used — transparency for the student

### `POST /learn/complete-lesson`

Mark a lesson as complete. Unlocks the next lesson or quiz.

**Request:**
```json
{
  "enrollment_id": "enr_001",
  "lesson_index": 2
}
```

---

## Quizzes

### `POST /quizzes/start`

Start a quiz session. Generates questions from the curriculum via Dify.

**Request:**
```json
{
  "enrollment_id": "enr_001"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "qsn_abc",
      "questions": [
        {
          "id": "q1",
          "type": "multiple_choice",
          "text": "What happens when a variable goes out of scope in Rust?",
          "options": [
            { "id": "a", "text": "Nothing" },
            { "id": "b", "text": "The drop function is called" },
            { "id": "c", "text": "A garbage collector frees the memory" },
            { "id": "d", "text": "The variable is moved to the heap" }
          ]
        }
      ],
      "time_limit_seconds": 600,
      "started_at": "2026-04-11T10:30:00Z",
      "expires_at": "2026-04-11T10:40:00Z"
    }
  }
}
```

**Anti-cheat:**
- Questions are randomly selected from a large pool generated per-curriculum
- Option order is randomized per student
- Session has a time limit (stored in Redis with TTL)
- Each student gets different questions
- Session ID is bound to the student's IP + user-agent fingerprint

### `POST /quizzes/:session_id/submit`

Submit quiz answers.

**Request:**
```json
{
  "answers": [
    { "question_id": "q1", "selected_option": "b" },
    { "question_id": "q2", "selected_option": "a" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "result": {
      "score": 85,
      "passed": true,
      "correct_answers": 17,
      "total_questions": 20,
      "reward_usdc": 2.00,
      "payout_status": "queued",
      "proof_of_learn_tx": null,
      "credential_token_id": null
    }
  }
}
```

**Side effects on pass:**
1. Emit `ProofOfLearn` event on-chain (includes student address, curriculum hash, score hash)
2. Mint SBT credential to student's wallet
3. Queue USDC payout via BullMQ -> Circle transfer
4. `proof_of_learn_tx` and `credential_token_id` populated after on-chain confirmation

---

## Wallet

### `GET /wallet/balance`

Get student's USDC balance and recent transactions.

**Response:**
```json
{
  "success": true,
  "data": {
    "wallet_address": "0x...",
    "balance_usdc": 14.00,
    "transactions": [
      {
        "id": "tx_001",
        "type": "reward",
        "amount_usdc": 2.00,
        "bounty_title": "Learn Rust Programming",
        "tx_hash": "0x...",
        "status": "confirmed",
        "created_at": "2026-04-11T10:41:00Z"
      }
    ]
  }
}
```

### `POST /wallet/withdraw`

Withdraw USDC to an external wallet address.

**Request:**
```json
{
  "to_address": "0x...",
  "amount_usdc": 10.00
}
```

---

## Webhooks (Inbound)

These endpoints receive callbacks from external services. All are authenticated via signature verification.

### `POST /webhooks/dify`

Called by Dify when a workflow completes (quiz scoring).

**Payload:**
```json
{
  "workflow_run_id": "wfr_123",
  "event": "workflow_finished",
  "data": {
    "outputs": {
      "session_id": "qsn_abc",
      "score": 85,
      "passed": true,
      "feedback": "Strong understanding of ownership concepts..."
    }
  }
}
```

### `POST /webhooks/circle`

Called by Circle on wallet and transfer events.

**Payload (transfer complete):**
```json
{
  "notificationType": "transfers.complete",
  "transfer": {
    "id": "tfr_456",
    "state": "COMPLETE",
    "amount": { "amount": "2.00", "currency": "USD" },
    "destination": { "address": "0x..." },
    "transactionHash": "0x..."
  }
}
```

### `POST /webhooks/chain`

Called by our blockchain event indexer when contract events are detected.

**Payload:**
```json
{
  "event": "ProofOfLearn",
  "args": {
    "student": "0x...",
    "curriculumHash": "0x...",
    "scoreHash": "0x...",
    "timestamp": 1712836860
  },
  "transactionHash": "0x...",
  "blockNumber": 12345678
}
```

---

## Health Check

### `GET /health`

```json
{
  "status": "ok",
  "services": {
    "database": "connected",
    "redis": "connected",
    "dify": "reachable",
    "circle": "reachable"
  }
}
```

---

## Rate Limits

| Endpoint Group | Limit | Window |
|---------------|-------|--------|
| Auth | 10 requests | 15 min |
| Learn/Chat | 60 requests | 1 min |
| Quiz Start | 3 requests | 1 hour |
| Quiz Submit | 1 request per session | N/A |
| Wallet Withdraw | 5 requests | 1 hour |
| All other | 100 requests | 1 min |

Rate limiting is enforced via Redis sliding window counters.
