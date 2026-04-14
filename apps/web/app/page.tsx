import { FeatureBento } from "@/components/landing/feature-bento"
import { HeroSection } from "@/components/landing/hero-section"
import { LearningTimeline } from "@/components/landing/learning-timeline"
import { ProofStats } from "@/components/landing/proof-stats"
import { RoleExperiences } from "@/components/landing/role-experiences"
import { WhatWeDoSection } from "@/components/landing/what-we-do-section"

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <WhatWeDoSection />
      <ProofStats />
      <FeatureBento />
      <LearningTimeline />
      <RoleExperiences />
    </>
  )
}
