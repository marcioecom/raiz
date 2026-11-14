const integerFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
})

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
})

export type VisitorTier = "semente" | "raiz" | "dourado"

const TIER_LABELS: Record<VisitorTier, string> = {
  semente: "Semente",
  raiz: "Raiz",
  dourado: "Dourado",
}

/** Formata quantidade inteira de sementes no padrão pt-BR. */
export function formatSeeds(value: number): string {
  return integerFormatter.format(Math.trunc(value))
}

/** Formata variação positiva ou negativa de sementes no extrato. */
export function formatDelta(delta: number): string {
  const truncated = Math.trunc(delta)
  if (truncated > 0) {
    return `+${formatSeeds(truncated)}`
  }
  if (truncated < 0) {
    return `-${formatSeeds(Math.abs(truncated))}`
  }
  return "0"
}

/** Converte centavos inteiros em moeda brasileira formatada. */
export function formatCentsBRL(cents: number): string {
  return brlFormatter.format(cents / 100)
}

/** Formata timestamp ISO em data curta local (dd/mm/aaaa). */
export function formatShortDateBR(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return "--"
  }
  return shortDateFormatter.format(date)
}

/** Formata timestamp ISO em dia/mês e horário locais (dd/mm, hh:mm). */
export function formatDateTimeBR(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return "--"
  }
  return dateTimeFormatter.format(date)
}

/** Traduz o identificador de nível do contrato para o rótulo exibido. */
export function formatTierLabel(tier: VisitorTier): string {
  return TIER_LABELS[tier]
}
