import { HeroSection } from "@/components/landing/hero-section"
import { LearningTimeline } from "@/components/landing/learning-timeline"
import { LiveActivity } from "@/components/landing/live-activity"
import { LiveTickerBar } from "@/components/landing/live-ticker-bar"
import { QuickAccess } from "@/components/landing/quick-access"
import { RoleExperiences } from "@/components/landing/role-experiences"
import { WhatWeDoSection } from "@/components/landing/what-we-do-section"

export default function HomePage() {
  return (
    <>
      <LiveTickerBar />
      <QuickAccess />
      <HeroSection />
      <WhatWeDoSection />
      <LearningTimeline />
      <LiveActivity />
      <RoleExperiences />
    </>
  )
}
