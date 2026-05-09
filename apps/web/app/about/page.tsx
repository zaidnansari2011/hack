import Link from "next/link"

export const metadata = {
  title: "About — Proof-of-Learn",
  description:
    "Why we built a sponsor-funded, on-chain proof-of-learning protocol settled in INR over UPI.",
}

export default function AboutPage() {
  return (
    <main className="bg-paper">
      <Hero />
      <Pillars />
      <Mechanics />
      <Closing />
    </main>
  )
}

function Hero() {
  return (
    <section className="border-b border-rule">
      <div className="mx-auto w-[min(960px,92vw)] py-24 lg:py-32">
        <span className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-teal">
          Manifesto
        </span>
        <h1 className="mt-6 max-w-[20ch] font-display text-[3rem] font-medium leading-[1.05] tracking-tight text-ink lg:text-[4rem]">
          Resumes lie.{" "}
          <span className="display-italic text-teal">Receipts don&rsquo;t.</span>
        </h1>
        <p className="mt-8 max-w-2xl text-[1.0625rem] leading-relaxed text-ink-soft">
          Proof-of-Learn is a protocol for sponsor-funded learning where every
          completion is a public, on-chain receipt — and every student is paid
          in INR over UPI within seconds of passing the quiz. We built it
          because the existing pipeline between someone learning a skill and
          someone hiring for it is broken on both ends: students pay to be
          taught, sponsors don&rsquo;t see whether anyone learned anything,
          and recruiters trust a CV more than they should.
        </p>
      </div>
    </section>
  )
}

function Pillars() {
  return (
    <section className="border-b border-rule bg-paper-deep/30">
      <div className="mx-auto w-[min(1100px,92vw)] py-20">
        <div className="grid gap-px overflow-hidden rounded-md border border-rule bg-rule lg:grid-cols-3">
          <Pillar
            eyebrow="01"
            title="Sponsors fund completions, not enrolments"
            body="Every payout is gated on a passed quiz. Money is escrowed up front, released per verified completion, and refundable on what wasn't earned. Sponsors stop guessing. Students stop being the ones taking risk."
          />
          <Pillar
            eyebrow="02"
            title="The credential is the receipt"
            body="There is no PDF a recruiter has to trust. Every pass is a soulbound token on Base, with a score commitment hash anyone can recompute against the on-chain record. Your wallet is your transcript."
          />
          <Pillar
            eyebrow="03"
            title="Settlement is in INR, not promises"
            body="The reward lands in the student's UPI within seconds of the quiz being scored. We use blockchain where it does work — escrow, proof — and rails where they do — last-mile payment. No tokens for users to manage. No bridges. No friction."
          />
        </div>
      </div>
    </section>
  )
}

function Pillar({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string
  title: string
  body: string
}) {
  return (
    <div className="bg-paper p-8 lg:p-10">
      <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-ink-faint">
        {eyebrow}
      </span>
      <h3 className="mt-4 font-display text-[1.375rem] font-medium leading-tight tracking-tight text-ink">
        {title}
      </h3>
      <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted">
        {body}
      </p>
    </div>
  )
}

function Mechanics() {
  const steps: { num: string; head: string; body: string }[] = [
    {
      num: "T+0s",
      head: "Sponsor funds a bounty",
      body: "USDC into the escrow contract. Each bounty pins a curriculum hash, a per-student reward, and a max-students cap. Returnable any time before completion.",
    },
    {
      num: "T+30m",
      head: "Student learns with the AI tutor",
      body: "Lessons grounded in a pgvector index, citations on every claim, three personas (Mentor / Examiner / Coach), four languages, and an inline check after each module.",
    },
    {
      num: "T+8m",
      head: "Proctored quiz, time-locked",
      body: "Per-session question rotation, choice shuffling, and a fingerprinted lock-in. The score never leaves our backend in the clear — only its commitment.",
    },
    {
      num: "T+3s",
      head: "Payout to UPI · proof on-chain",
      body: "Razorpay sends the INR. Escrow releases the reward. The credential mints. The activity feed updates. Three transactions, one moment.",
    },
  ]
  return (
    <section className="border-b border-rule">
      <div className="mx-auto w-[min(960px,92vw)] py-24">
        <span className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-teal">
          The four-second loop
        </span>
        <h2 className="mt-6 max-w-[18ch] font-display text-[2.25rem] font-medium leading-[1.1] tracking-tight text-ink">
          From sponsor wire to student UPI in a single session.
        </h2>
        <ol className="mt-10 space-y-8">
          {steps.map((s) => (
            <li
              key={s.num}
              className="grid gap-6 border-t border-rule pt-6 lg:grid-cols-[120px_1fr]"
            >
              <span className="font-mono text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-ink-faint">
                {s.num}
              </span>
              <div>
                <h3 className="font-display text-[1.125rem] font-medium tracking-tight text-ink">
                  {s.head}
                </h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-muted">
                  {s.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Closing() {
  return (
    <section>
      <div className="mx-auto w-[min(960px,92vw)] py-24 text-center">
        <span className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-teal">
          Try it
        </span>
        <h2 className="mt-6 mx-auto max-w-[20ch] font-display text-[2.25rem] font-medium leading-[1.1] tracking-tight text-ink">
          Pick a side. Each one is a different protocol.
        </h2>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href="/login?role=student"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[0.875rem] font-medium text-paper transition-colors hover:bg-ink/90"
          >
            Continue as a student →
          </Link>
          <Link
            href="/login?role=sponsor"
            className="inline-flex items-center gap-2 rounded-full border border-rule bg-surface px-6 py-3 text-[0.875rem] font-medium text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
          >
            Continue as a sponsor
          </Link>
          <Link
            href="/recruit"
            className="inline-flex items-center gap-2 rounded-full border border-rule bg-surface px-6 py-3 text-[0.875rem] font-medium text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
          >
            Browse verified talent
          </Link>
        </div>
      </div>
    </section>
  )
}
