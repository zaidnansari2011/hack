import { SponsorShell } from "@/components/sponsor/sponsor-shell"

export default function SponsorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <SponsorShell>{children}</SponsorShell>
}
