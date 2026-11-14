import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn("inline-block text-sm font-semibold leading-5 text-ink", className)}
      {...props}
    />
  )
}
