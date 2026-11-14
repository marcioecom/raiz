import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "min-h-12 w-full rounded-xl border border-control-border bg-card px-3.5 py-2.5 text-base leading-6 text-ink placeholder:text-ink-muted transition-colors duration-150 focus-visible:border-forest disabled:cursor-not-allowed disabled:bg-sand disabled:text-ink-muted",
        className,
      )}
      {...props}
    />
  )
}
