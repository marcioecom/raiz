import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-xl border border-border bg-sand", className)}
      {...props}
    />
  )
}

export interface SkeletonGroupProps extends ComponentProps<"div"> {
  label: string
}

export function SkeletonGroup({ label, className, children, ...props }: SkeletonGroupProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn("flex flex-col gap-3", className)}
      {...props}
    >
      {children}
      <span className="visually-hidden">{label}</span>
    </div>
  )
}
