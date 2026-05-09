import { HeroSection } from "@/components/landing/hero-section"
import { LearningTimeline } from "@/components/landing/learning-timeline"
import { LiveActivity } from "@/components/landing/live-activity"
import { RoleExperiences } from "@/components/landing/role-experiences"
import { WhatWeDoSection } from "@/components/landing/what-we-do-section"

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <WhatWeDoSection />
      <LearningTimeline />
      <LiveActivity />
      <RoleExperiences />
    </>
  )
}
