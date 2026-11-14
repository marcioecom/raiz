import { Info, ReceiptText } from "lucide-react"

import { Card } from "@/components/ui/card"

const SCAN_RULES = [
  {
    label: "CNPJ fora da base parceira",
    detail: "ganha 10 sementes base automaticamente e entra em conferência, sem erro na tela.",
  },
  {
    label: "Limite por loja",
    detail: "até 1 cupom por loja por dia.",
  },
  {
    label: "Limite diário",
    detail: "máximo de 5 cupons por dia.",
  },
  {
    label: "Janela de emissão",
    detail: "cupons emitidos há até 72 horas.",
  },
  {
    label: "Uso único",
    detail: "cada chave de 44 dígitos pontua uma única vez.",
  },
] as const

/** Bloco visual compartilhado explicando onde localizar os 11 grupos de 4 dígitos na NFC-e. */
export function AccessKeyLocationCard() {
  return (
    <Card variant="sand" className="flex flex-col gap-2.5 p-3.5">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <ReceiptText aria-hidden="true" className="h-4 w-4 text-forest" strokeWidth={1.75} />
        <span>No papel do cupom fiscal (NFC-e)</span>
      </div>
      <p className="text-[14px] leading-5 text-ink-muted">
        Logo acima ou abaixo do QR Code aparece o título{" "}
        <strong className="text-ink">CHAVE DE ACESSO</strong> seguido por 11 grupos de 4 números:
      </p>
      <p className="rounded-lg border border-border bg-card p-2.5 text-center font-mono text-xs font-semibold leading-5 tracking-wider text-ink tabular-nums">
        1726 0112 3456 7800 0199 6500 1000 0001 2311 2345 6787
      </p>
    </Card>
  )
}

/** Resumo calmo das regras de pontuação e antifraude do registro de cupons. */
export function AccessKeyRulesCard() {
  return (
    <Card variant="surface" className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <Info aria-hidden="true" className="h-4 w-4 shrink-0 text-forest" strokeWidth={1.75} />
        <h3 className="text-base font-semibold leading-6 text-ink">Regras do registro</h3>
      </div>

      <ul
        role="list"
        className="flex list-none flex-col gap-2.5 text-[13px] leading-[18px] text-ink-muted"
      >
        {SCAN_RULES.map((rule) => (
          <li key={rule.label} className="flex items-start gap-2">
            <span
              aria-hidden="true"
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-forest"
            />
            <span>
              <strong className="font-semibold text-ink">{rule.label}:</strong> {rule.detail}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
