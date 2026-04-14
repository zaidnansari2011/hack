"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { BriefcaseBusiness, GraduationCap, CheckCircle2, Coins } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function RoleExperiences() {
  const [tab, setTab] = useState("student")

  return (
    <section id="roles" className="px-4 pb-20 md:px-8 md:pb-28">
      <div className="mx-auto w-[min(1200px,92vw)]">
        <div className="mb-7 flex items-center gap-2 text-sm font-medium text-slate-500">
          <BriefcaseBusiness className="size-4 text-blue-600" />
          Product Views
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList>
            <TabsTrigger value="student">Student Experience</TabsTrigger>
            <TabsTrigger value="sponsor">Sponsor Experience</TabsTrigger>
          </TabsList>

          <TabsContent value="student">
            <motion.div
              key="student"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="grid gap-6 md:grid-cols-[1.15fr_0.85fr]"
            >
              <div className="rounded-2xl border border-slate-200 bg-linear-to-b from-white to-slate-50 p-6">
                <div className="mb-4 flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>ST</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-slate-900">Student Workspace</p>
                    <p className="text-sm text-slate-500">Rust Fundamentals · Lesson 6 of 10</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  {[
                    "AI tutor gives context-aware hints",
                    "Timed quiz gate with answer-order randomization",
                    "Instant payout receipt after passing",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="mb-2 flex items-center gap-2 text-slate-900">
                  <Coins className="size-5 text-emerald-600" />
                  <p className="font-semibold">Wallet Snapshot</p>
                </div>
                <p className="text-4xl font-semibold text-slate-900">$42.80</p>
                <p className="mt-2 text-sm text-slate-500">+ $2.00 from Rust Quiz #6</p>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="sponsor">
            <motion.div
              key="sponsor"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="grid gap-6 md:grid-cols-[1fr_1fr]"
            >
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="mb-3 flex items-center gap-2 text-slate-900">
                  <BriefcaseBusiness className="size-5 text-blue-600" />
                  <p className="font-semibold">Escrow Program Overview</p>
                </div>
                <div className="space-y-3 text-sm text-slate-700">
                  <div className="flex justify-between rounded-lg bg-slate-50 p-3">
                    <span>Funded students</span>
                    <span className="font-semibold">10,000</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-slate-50 p-3">
                    <span>Completion ratio</span>
                    <span className="font-semibold">71%</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-slate-50 p-3">
                    <span>Remaining escrow</span>
                    <span className="font-semibold">$5,800</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-white to-blue-50 p-6">
                <div className="mb-2 flex items-center gap-2 text-slate-900">
                  <GraduationCap className="size-5 text-indigo-600" />
                  <p className="font-semibold">Program Signals</p>
                </div>
                <p className="text-sm leading-relaxed text-slate-600">
                  High retention in Module 3 indicates strong tutor effectiveness. Recommend increasing reward size for advanced tracks to
                  accelerate completions.
                </p>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}
