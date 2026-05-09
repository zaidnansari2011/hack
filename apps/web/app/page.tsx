import { HeroSection } from "@/components/landing/hero-section"
import { LearningTimeline } from "@/components/landing/learning-timeline"
import { RoleExperiences } from "@/components/landing/role-experiences"
import { WhatWeDoSection } from "@/components/landing/what-we-do-section"

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <LearningTimeline />
      <WhatWeDoSection />
      <FeatureBento />
      <RoleExperiences />
    </>
  )
}
