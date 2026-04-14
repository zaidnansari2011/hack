"use client"

import { motion } from "framer-motion"

export function MagicBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_45%,#eef2ff_100%)]" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.2)_1px,transparent_0)] bg-size-[22px_22px] mask-[radial-gradient(ellipse_at_center,black_30%,transparent_82%)]" />

      <motion.div
        animate={{ x: [-40, 35, -40], y: [-20, 20, -20] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-[6%] top-[8%] h-64 w-64 rounded-full bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.2)_0%,rgba(37,99,235,0)_70%)] blur-xl"
      />

      <motion.div
        animate={{ x: [30, -24, 30], y: [18, -28, 18] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        className="absolute right-[7%] top-[16%] h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.16)_0%,rgba(16,185,129,0)_70%)] blur-xl"
      />

      <motion.div
        animate={{ x: [0, 26, 0], y: [0, -14, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[12%] left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.14)_0%,rgba(99,102,241,0)_72%)] blur-xl"
      />
    </div>
  )
}
