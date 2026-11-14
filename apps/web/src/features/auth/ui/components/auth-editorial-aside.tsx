import { ShieldCheck } from "lucide-react"

import { RaizLogo } from "@/components/raiz-logo"

const EDITORIAL_STEPS = [
  {
    number: "01",
    title: "Cupom NFC-e",
    description:
      "Escaneie o QR Code ou digite os 44 dígitos da nota fiscal após suas compras no shopping.",
  },
  {
    number: "02",
    title: "Sementes e missões",
    description:
      "Cada cupom soma sementes no seu extrato e avança missões entre lojas e categorias.",
  },
  {
    number: "03",
    title: "Benefício real na mesma visita",
    description: "Troque sementes por café, estacionamento ou experiências no balcão, sem sorteio.",
  },
] as const

export interface AuthEditorialAsideProps {
  onOpenPrivacy: () => void
}

export function AuthEditorialAside({ onOpenPrivacy }: AuthEditorialAsideProps) {
  return (
    <section
      aria-label="Sobre o programa Raiz"
      className="hidden lg:flex lg:flex-col lg:justify-between lg:gap-8 lg:pr-6"
    >
      <div className="flex flex-col items-start">
        <RaizLogo />
        <p className="mt-5 font-serif text-[36px] leading-[1.1] tracking-[-0.015em] text-forest">
          Quem volta, cria raiz.
        </p>
        <p className="mt-2 text-sm font-medium leading-5 text-ink-muted">
          Capim Dourado Shopping · Palmas-TO
        </p>
      </div>

      <ol className="flex flex-col gap-4">
        {EDITORIAL_STEPS.map((step) => (
          <li key={step.number} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-card font-mono text-xs font-semibold tabular-nums text-forest"
            >
              {step.number}
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold leading-5 text-ink">{step.title}</p>
              <p className="mt-0.5 text-[13px] leading-[18px] text-ink-muted">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-border bg-sand/70 p-4 text-xs leading-relaxed text-ink-muted">
        <p>
          Privacidade por padrão: pedimos apenas nome e telefone. Sem senha, sem instalar app e CPF
          do cupom descartado na hora.
        </p>
        <button
          type="button"
          onClick={onOpenPrivacy}
          className="mt-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-xs font-semibold text-forest underline underline-offset-4 hover:text-ink"
        >
          <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span>Ler resumo de privacidade</span>
        </button>
      </div>
    </section>
  )
}
