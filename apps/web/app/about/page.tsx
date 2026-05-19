import Link from "next/link"

export const metadata = {
  title: "About · EduPay",
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
          EduPay pays students for actually learning. Sponsors put
          money into escrow, students work through an AI tutor, and the moment
          a quiz clears (usually in a single session), rupees land in their
          UPI. No PDFs for recruiters to guess at. No promises to take on
          faith. Just a public receipt anyone can check.
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
            title="Pay for learning that actually happened"
            body="Every bounty pays out on a passed quiz, not a sign-up. Funds sit in escrow until a student earns them, then release automatically. Sponsors stop paying for effort. Students stop taking on the financial risk of trying."
          />
          <Pillar
            eyebrow="02"
            title="Your wallet is your transcript"
            body="There's no certificate anyone has to take on faith. Every completed quiz becomes a soulbound token on Base with a score hash anyone can recompute. When a recruiter asks for proof, you share a link. Not a PDF."
          />
          <Pillar
            eyebrow="03"
            title="Real rupees, not tokens you have to sell"
            body="The reward lands in UPI within seconds of the quiz being scored. We use blockchain where it genuinely helps: escrow and proof. Familiar rails for the last mile. Students never need a wallet or a token."
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
      body: "Funds go into a contract on Base. Each bounty specifies which curriculum, how much per student, and how many seats. Whatever goes unearned is fully reclaimable.",
    },
    {
      num: "T+30m",
      head: "Student learns with the AI tutor",
      body: "The tutor works from the curriculum directly, not the internet. Every answer has a citation. Three conversation styles, four languages, and a quick check after each section.",
    },
    {
      num: "T+8m",
      head: "Proctored quiz, time-locked",
      body: "Questions rotate each session, choices shuffle, and the clock runs. One shot per session. The score goes on-chain as a hash, not raw data, so it can't be disputed or tampered with.",
    },
    {
      num: "T+3s",
      head: "Payout to UPI · proof on-chain",
      body: "Razorpay sends the rupees. Escrow releases. The credential mints. Three things happen in one moment, and the activity feed lights up.",
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
          Pick your role. The experience is completely different.
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
