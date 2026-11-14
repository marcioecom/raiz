import { Badge } from "@/components/ui/badge"

export interface DemoBadgeProps {
  label?: string
  className?: string
}

export function DemoBadge({ label = "Demonstração", className }: DemoBadgeProps) {
  return (
    <Badge variant="demo" className={className}>
      {label}
    </Badge>
  )
}
