"use client"

import { useEffect } from "react"

let lockCount = 0
let savedScrollY = 0
let savedBodyStyle: {
  position: string
  top: string
  left: string
  right: string
  width: string
  overflow: string
  paddingRight: string
} | null = null

function getScrollbarWidth() {
  return window.innerWidth - document.documentElement.clientWidth
}

function lockBody() {
  if (lockCount++ > 0) return
  const scrollY = window.scrollY
  savedScrollY = scrollY
  const scrollbarWidth = getScrollbarWidth()
  const body = document.body
  savedBodyStyle = {
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
    overflow: body.style.overflow,
    paddingRight: body.style.paddingRight,
  }
  body.style.position = "fixed"
  body.style.top = `-${scrollY}px`
  body.style.left = "0"
  body.style.right = "0"
  body.style.width = "100%"
  body.style.overflow = "hidden"
  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${scrollbarWidth}px`
  }
}

function unlockBody() {
  if (--lockCount > 0) return
  lockCount = 0
  if (!savedBodyStyle) return
  const body = document.body
  body.style.position = savedBodyStyle.position
  body.style.top = savedBodyStyle.top
  body.style.left = savedBodyStyle.left
  body.style.right = savedBodyStyle.right
  body.style.width = savedBodyStyle.width
  body.style.overflow = savedBodyStyle.overflow
  body.style.paddingRight = savedBodyStyle.paddingRight
  savedBodyStyle = null
  window.scrollTo(0, savedScrollY)
}

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    lockBody()
    return unlockBody
  }, [active])
}
