import { useState } from "react"

import { cn } from "@/lib/utils"

import { JasonScareDialog } from "./jason-scare-dialog"

const JASON_TRIGGER_CLICKS = 13

export interface RaizLogoProps {
  className?: string
  showWordmark?: boolean
  interactive?: boolean
}

function getGrowthStage(clickCount: number): 0 | 1 | 2 | 3 | 4 {
  if (clickCount <= 0) return 0
  if (clickCount <= 4) return 1
  if (clickCount <= 8) return 2
  if (clickCount <= 12) return 3
  return 4
}

function RaizBrandMark() {
  return (
    <svg
      aria-hidden="true"
      className="h-7 w-7 shrink-0 overflow-visible"
      fill="none"
      viewBox="0 0 28 28"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14 16C14.8 10.5 18 6 23 4C19.5 6.8 16.2 11 15.2 16"
        stroke="#C8963E"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
      <path
        d="M13.5 16C12 11.5 8.5 7.5 5 5.5C8 8.5 11.2 12 12.2 16.5"
        stroke="#C8963E"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
      <g className="raiz-logo-roots">
        <path
          d="M14 16V25M14 20.5L9.5 24.5M14 20L18.5 24"
          stroke="#1F3A2E"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
        />
      </g>
      <g className="raiz-logo-rootlets">
        <path
          d="M14 24.5V28.4M9.5 24.5L7.6 27.5M18.5 24L20.4 27.2M14 22.8L11.9 26M14 22.4L16.1 25.8"
          stroke="#1F3A2E"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  )
}

export function RaizLogo({ className, showWordmark = true, interactive = true }: RaizLogoProps) {
  const [clickCount, setClickCount] = useState(0)
  const [scareOpen, setScareOpen] = useState(false)

  const growthStage = getGrowthStage(clickCount)

  function handleLogoClick() {
    if (scareOpen) return
    const nextCount = clickCount + 1
    if (nextCount >= JASON_TRIGGER_CLICKS) {
      setClickCount(JASON_TRIGGER_CLICKS)
      setScareOpen(true)
      return
    }
    setClickCount(nextCount)
  }

  function handleScareOpenChange(nextOpen: boolean) {
    setScareOpen(nextOpen)
    if (!nextOpen) {
      setClickCount(0)
    }
  }

  const content = (
    <>
      <RaizBrandMark />
      {showWordmark ? (
        <span className="font-serif text-[22px] tracking-[0.04em] text-forest">RAIZ</span>
      ) : null}
    </>
  )

  if (!interactive) {
    return (
      <span
        aria-label={showWordmark ? undefined : "RAIZ"}
        className={cn("inline-flex items-center gap-2.5", className)}
        role={showWordmark ? undefined : "img"}
      >
        {content}
      </span>
    )
  }

  return (
    <>
      <button
        aria-label={showWordmark ? undefined : "RAIZ"}
        className={cn(
          "raiz-logo-button inline-flex cursor-pointer select-none items-center gap-2.5 rounded-lg bg-transparent py-1 pr-1 text-left transition-transform active:scale-[0.98]",
          className,
        )}
        data-easter-egg={scareOpen ? "true" : "false"}
        data-growth={String(growthStage)}
        type="button"
        onClick={handleLogoClick}
      >
        {content}
      </button>
      <JasonScareDialog open={scareOpen} onOpenChange={handleScareOpenChange} />
    </>
  )
}
