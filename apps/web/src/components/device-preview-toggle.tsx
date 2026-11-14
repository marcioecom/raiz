import { Monitor, Smartphone } from "lucide-react"

import { cn } from "@/lib/utils"

export interface DevicePreviewToggleProps {
  active: boolean
  onToggle: () => void
  variant?: "sidebar" | "toolbar"
  className?: string
}

export function DevicePreviewToggle({
  active,
  onToggle,
  variant = "toolbar",
  className,
}: DevicePreviewToggleProps) {
  const Icon = active ? Monitor : Smartphone
  const label = active ? "Desativar modo celular" : "Simular celular"

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest",
        variant === "sidebar"
          ? "w-full justify-start border-border bg-canvas px-3 py-2.5 text-ink hover:bg-sand hover:text-forest"
          : active
            ? "border-forest bg-forest px-3.5 py-2 text-on-forest hover:bg-ink"
            : "border-border bg-card px-3.5 py-2 text-ink hover:bg-sand hover:text-forest",
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
      <span>{label}</span>
    </button>
  )
}
