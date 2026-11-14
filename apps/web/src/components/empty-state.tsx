import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: LucideIcon
  actionLabel?: string
  onAction?: () => void
  action?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  icon: Icon = Info,
  actionLabel,
  onAction,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Card variant="sand" className={cn("flex flex-col items-start gap-3 p-5", className)}>
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-forest">
        <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold leading-6 text-ink">{title}</h2>
        {description && <p className="text-[15px] leading-[22px] text-ink-muted">{description}</p>}
      </div>
      {action}
      {!action && actionLabel && onAction && (
        <Button variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Card>
  )
}
