import { HeroSection } from "@/components/landing/hero-section"
import { LearningTimeline } from "@/components/landing/learning-timeline"
import { LiveActivity } from "@/components/landing/live-activity"
import { LiveTickerBar } from "@/components/landing/live-ticker-bar"
import { RoleExperiences } from "@/components/landing/role-experiences"
import { WhatWeDoSection } from "@/components/landing/what-we-do-section"

export default function HomePage() {
  return (
    <>
      <LiveTickerBar />
      <HeroSection />
      <WhatWeDoSection />
      <LearningTimeline />
      <LiveActivity />
      <RoleExperiences />
    </>
  )
}
