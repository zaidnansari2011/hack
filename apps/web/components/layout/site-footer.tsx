import { Separator } from "@/components/ui/separator"

export function SiteFooter() {
  return (
    <footer className="mx-auto w-[min(1200px,92vw)] py-14 text-sm text-slate-500">
      <Separator className="mb-6" />
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p>© 2026 Proof-of-Learn. Verified education, guaranteed payouts.</p>
        <p className="text-slate-400">Built with Next.js, Motion, GSAP, shadcn, and Magic UI principles.</p>
      </div>
    </footer>
  )
}
