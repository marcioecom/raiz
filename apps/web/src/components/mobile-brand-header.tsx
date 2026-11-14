import type { ReactNode } from "react"

import { DemoBadge } from "@/components/demo-badge"
import { RaizLogo } from "@/components/raiz-logo"
import { cn } from "@/lib/utils"

export interface MobileBrandHeaderProps {
  demo?: boolean
  rightSlot?: ReactNode
  className?: string
}

export function MobileBrandHeader({ demo = false, rightSlot, className }: MobileBrandHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-2 lg:hidden", className)}>
      <RaizLogo />
      {(demo || rightSlot) && (
        <div className="flex items-center gap-2">
          {demo ? <DemoBadge /> : null}
          {rightSlot}
        </div>
      )}
    </div>
  )
}
