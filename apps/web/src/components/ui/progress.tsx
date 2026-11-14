import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

export interface ProgressProps extends Omit<ComponentProps<"div">, "children"> {
  value: number
  max?: number
  label: string
  completed?: boolean
}

export function Progress({
  value,
  max = 100,
  label,
  completed = false,
  className,
  ...props
}: ProgressProps) {
  const safeMax = max > 0 ? max : 100
  const clampedValue = Math.min(Math.max(value, 0), safeMax)
  const percentage = Math.round((clampedValue / safeMax) * 100)

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={clampedValue}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-border", className)}
      {...props}
    >
      <div
        className={cn("h-full rounded-full", completed ? "bg-success" : "bg-gold")}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}
