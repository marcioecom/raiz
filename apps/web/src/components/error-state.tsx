import { WifiOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface ErrorStateProps {
  title?: string
  message?: string
  onRetry: () => void
  retryLabel?: string
  className?: string
}

export function ErrorState({
  title = "Não foi possível carregar",
  message = "Sem conexão no momento ou instabilidade temporária. Tente de novo em instantes.",
  onRetry,
  retryLabel = "Tentar de novo",
  className,
}: ErrorStateProps) {
  return (
    <Card className={cn("flex flex-col items-start gap-3 p-5", className)}>
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-error-soft text-error">
        <WifiOff aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold leading-6 text-ink">{title}</h2>
        <p className="text-[15px] leading-[22px] text-ink-muted">{message}</p>
      </div>
      <Button variant="primary" onClick={onRetry}>
        {retryLabel}
      </Button>
    </Card>
  )
}
