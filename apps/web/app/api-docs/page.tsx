import Link from "next/link"

export const metadata = {
  title: "API · Proof-of-Learn",
  description:
    "Public read endpoints for verifying credentials and querying the on-chain talent layer.",
}

type Endpoint = {
  method: "GET"
  path: string
  summary: string
  body: string
  response: string
  curl: string
}

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/api/v1/proofs/by-tx/:txHash",
    summary:
      "Resolve a single verified credential by its on-chain tx hash. Drives the public verify page; safe to embed anywhere.",
    body: "—",
    response: `{
  "success": true,
  "data": {
    "credential": {
      "txHash": "0x…",
      "scoreHash": "0x…",
      "commitment": "0x…",
      "tokenId": "1042",
      "status": "minted",
      "studentAddress": "0x…",
      "studentInitials": "AR",
      "scorePct": 92,
      "passedAt": "2026-05-09T15:08:29.095Z",
      "curriculum": { "slug": "solidity-101", "title": "Solidity & Smart Contract Security", "summary": "…" },
      "bounty": { "id": "uuid", "title": "Master Solidity security…", "sponsorName": "Web3 India Grants", "rewardInr": 400 },
      "chain": { "network": "Base Sepolia", "basescanTxUrl": "…", "basescanAddressUrl": "…" }
    }
  }
}`,
    curl: `curl https://your-host/api/v1/proofs/by-tx/0xabc…`,
  },
  {
    method: "GET",
    path: "/api/v1/credentials/by-address/:address",
    summary:
      "Full transcript for a wallet. Every minted SBT, totals, and a per-curriculum chip list. The endpoint behind /credentials/[address].",
    body: "—",
    response: `{
  "success": true,
  "data": {
    "profile": {
      "address": "0x…",
      "studentInitials": "AR",
      "totalCredentials": 3,
      "totalEarnedInr": 950,
      "firstPassedAt": "2026-04-12T11:21:09Z",
      "curricula": [{ "slug": "solidity-101", "title": "Solidity…" }, …],
      "credentials": [
        { "txHash": "0x…", "scorePct": 92, "passedAt": "…", "curriculumTitle": "…", "rewardInr": 400, "bountyTitle": "…", "sponsorName": "…", "tokenId": "1042" }
      ],
      "basescanAddressUrl": "https://sepolia.basescan.org/address/0x…"
    }
  }
}`,
    curl: `curl https://your-host/api/v1/credentials/by-address/0xd183…`,
  },
  {
    method: "GET",
    path: "/api/v1/recruit",
    summary:
      "Public talent search. Filter by curriculum, score floor, and time window. Returns up to 50 verified candidates. Used by /recruit.",
    body: `?curriculum=solidity-101  // optional
?minScore=75              // optional · 0-100
?withinDays=30            // optional · 1-365`,
    response: `{
  "success": true,
  "data": {
    "candidates": [
      { "txHash": "0x…", "studentAddress": "0x…", "studentInitials": "AR", "scorePct": 92, "passedAt": "…", "curriculumTitle": "Solidity…", "curriculumSlug": "solidity-101", "rewardInr": 400 },
      …
    ],
    "curricula": [{ "slug": "solidity-101", "title": "Solidity…", "passedCount": 4 }, …],
    "total": 9
  }
}`,
    curl: `curl "https://your-host/api/v1/recruit?curriculum=solidity-101&minScore=75"`,
  },
  {
    method: "GET",
    path: "/api/v1/activity",
    summary:
      "Recent platform events (completions, fundings, enrolments) plus aggregate stats. Newest first.",
    body: "—",
    response: `{
  "success": true,
  "data": {
    "events": [
      { "kind": "completion", "at": "…", "studentInitials": "AR", "rewardInr": 400, "curriculumTitle": "Solidity…", "txHash": "0x…", … },
      { "kind": "bounty_funded", "at": "…", "sponsorName": "Web3 India Grants", "rewardInr": 400, "maxStudents": 50, … },
      …
    ],
    "stats": { "totalBounties": 4, "totalCompletions": 9, "totalPaidInr": 2650, "activeStudents": 9 }
  }
}`,
    curl: `curl https://your-host/api/v1/activity`,
  },
  {
    method: "GET",
    path: "/api/v1/activity/stream",
    summary:
      "Server-Sent Events feed of the same payload, pushed every ~4s when something changes. The landing-page ticker subscribes to this.",
    body: `Accept: text/event-stream`,
    response: `event: activity
data: {"events":[…],"stats":{…}}

: ping            # heartbeat between updates
`,
    curl: `curl -N -H "Accept: text/event-stream" https://your-host/api/v1/activity/stream`,
  },
]

export default function ApiDocsPage() {
  return (
    <main className="bg-paper">
      <Hero />
      <div className="mx-auto w-[min(960px,92vw)] pb-24">
        <div className="space-y-10">
          {ENDPOINTS.map((e) => (
            <EndpointCard key={e.path} endpoint={e} />
          ))}
        </div>
        <div className="mt-16 rounded-md border border-rule bg-surface p-8">
          <span className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-teal">
            What&rsquo;s next
          </span>
          <h2 className="mt-3 font-display text-[1.5rem] font-medium tracking-tight text-ink">
            Authenticated write endpoints land in v2.
          </h2>
          <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-muted">
            Bounty creation, enrollment, quiz submission, and tutor chat are
            all reachable today via the{" "}
            <Link
              href="/login"
              className="font-medium text-ink underline-offset-4 hover:underline"
            >
              authenticated UI
            </Link>
            ; we&rsquo;re documenting the OAuth + signed-request flow that
            opens those up to third-party clients.
          </p>
        </div>
      </div>
    </main>
  )
}

function Hero() {
  return (
    <section className="border-b border-rule">
      <div className="mx-auto w-[min(960px,92vw)] py-20">
        <span className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-teal">
          Read API · v1
        </span>
        <h1 className="mt-5 font-display text-[2.5rem] font-medium leading-[1.05] tracking-tight text-ink">
          Audit the protocol from anywhere.
        </h1>
        <p className="mt-5 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-soft">
          Every credential, every bounty, every completion is queryable
          without an API key. Use these endpoints to embed verifications,
          build hiring tooling, or audit individual proofs against the
          on-chain record.
        </p>
      </div>
    </section>
  )
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  return (
    <article className="overflow-hidden rounded-md border border-rule bg-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-rule bg-surface-soft px-6 py-3.5">
        <span className="rounded-full bg-teal-soft px-2.5 py-0.5 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-teal">
          {endpoint.method}
        </span>
        <code className="font-mono text-[0.875rem] text-ink">
          {endpoint.path}
        </code>
      </div>
      <div className="space-y-5 p-6 lg:p-8">
        <p className="text-[0.9375rem] leading-relaxed text-ink-soft">
          {endpoint.summary}
        </p>
        {endpoint.body !== "—" && (
          <CodeBlock label="Request" content={endpoint.body} />
        )}
        <CodeBlock label="Response" content={endpoint.response} />
        <CodeBlock label="Curl" content={endpoint.curl} mono="terminal" />
      </div>
    </article>
  )
}

function CodeBlock({
  label,
  content,
  mono,
}: {
  label: string
  content: string
  mono?: "terminal"
}) {
  return (
    <div>
      <div className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-ink-faint">
        {label}
      </div>
      <pre
        className={`mt-2 overflow-x-auto rounded-sm border border-rule bg-paper-deep/30 p-4 font-mono text-[0.75rem] leading-relaxed ${
          mono === "terminal" ? "text-teal" : "text-ink-soft"
        }`}
      >
        {content}
      </pre>
    </div>
  )
}
