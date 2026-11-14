import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { AccessKeyLocationCard, AccessKeyRulesCard } from "./access-key-help-content"

export interface ScanHelpPanelProps {
  className?: string
}

/** Painel lateral de orientação e regras exibido em desktop (>= 1024px). */
export function ScanHelpPanel({ className }: ScanHelpPanelProps) {
  return (
    <section
      aria-label="Onde encontrar a chave no cupom e regras de registro"
      className={cn("hidden min-w-0 lg:flex lg:flex-col lg:gap-4", className)}
    >
      <Card variant="surface" className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold leading-6 tracking-[-0.01em] text-ink">
            Onde encontrar a chave no cupom?
          </h2>
          <p className="text-sm leading-5 text-ink-muted">
            Procure a sequência de 44 dígitos dividida em 11 blocos de 4 números.
          </p>
        </div>

        <AccessKeyLocationCard />
      </Card>

      <AccessKeyRulesCard />
    </section>
  )
}
