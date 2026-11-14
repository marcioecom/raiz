import type { ReceiptResult } from "../../types"

import { Link } from "@tanstack/react-router"
import { Check, CheckCircle2, Info, ScanLine } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatCentsBRL, formatSeeds } from "@/lib/format"

export interface ReceiptSuccessCardProps {
  result: ReceiptResult
  onScanAnother: () => void
}

export function ReceiptSuccessCard({ result, onScanAnother }: ReceiptSuccessCardProps) {
  const receipt = result.receipt
  const pointsAwarded = receipt?.points_awarded ?? 0
  const hasAmount = typeof receipt?.total_cents === "number" && receipt.total_cents !== null
  const storeName = receipt?.store_name?.trim() || null
  const missions = result.missions_advanced ?? []

  return (
    <section aria-label="Confirmação do cupom" className="flex flex-col gap-4">
      <Card variant="surface" className="flex flex-col items-center gap-4 p-6 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 aria-hidden="true" className="h-8 w-8" strokeWidth={1.75} />
        </span>

        <div className="flex flex-col gap-1">
          <p className="text-[32px] font-bold leading-9 tracking-[-0.02em] text-forest tabular-nums">
            +{formatSeeds(pointsAwarded)} sementes
          </p>

          {typeof result.balance === "number" && (
            <p className="text-[15px] font-medium leading-[22px] text-ink-muted tabular-nums">
              Novo saldo:{" "}
              <strong className="font-semibold text-ink">
                {formatSeeds(result.balance)} sementes
              </strong>
            </p>
          )}
        </div>

        {(storeName || hasAmount) && (
          <p className="text-base font-semibold leading-6 text-ink tabular-nums">
            {storeName && hasAmount && `${storeName} · ${formatCentsBRL(receipt!.total_cents!)}`}
            {storeName && !hasAmount && storeName}
            {!storeName && hasAmount && formatCentsBRL(receipt!.total_cents!)}
          </p>
        )}

        {receipt?.status === "review" ? (
          <div className="flex w-full items-start gap-2.5 rounded-xl border border-border bg-sand p-3.5 text-left text-ink-muted">
            <Info
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-ink"
              strokeWidth={1.75}
            />
            <p className="text-[13px] font-medium leading-[18px]">
              Loja fora da base parceira: suas {formatSeeds(pointsAwarded)} sementes base foram
              creditadas e o CNPJ entrou em fila de conferência.
            </p>
          </div>
        ) : (
          <p className="w-full border-t border-border pt-4 text-[13px] leading-[18px] text-ink-muted">
            Crédito adicionado ao seu extrato. Você já pode acompanhar suas missões e prêmios.
          </p>
        )}
      </Card>

      {missions.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
            Missões atualizadas
          </h2>
          {missions.map((mission, index) => {
            const progress = Math.max(mission.progress ?? 0, 0)
            const target = Math.max(mission.target ?? 0, 0)
            const completed = Boolean(mission.completed)
            const title = mission.title ?? "Missão da safra"

            return (
              <Card
                key={mission.mission_id ?? index}
                variant={completed ? "sand" : "surface"}
                className="flex flex-col gap-3 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold leading-snug text-ink">{title}</h3>
                  <span className="shrink-0 text-[13px] font-bold text-forest tabular-nums">
                    {progress}/{target}
                  </span>
                </div>

                <Progress
                  value={progress}
                  max={target > 0 ? target : 1}
                  completed={completed}
                  label={`Progresso de ${title}: ${progress} de ${target}`}
                />

                {completed && (
                  <div className="flex items-center">
                    <Badge variant="success" className="tabular-nums">
                      <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.25} />
                      <span>
                        Missão concluída
                        {typeof mission.points_awarded === "number" && mission.points_awarded > 0
                          ? ` · +${formatSeeds(mission.points_awarded)} sementes`
                          : ""}
                      </span>
                    </Badge>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <div className="mt-2 flex flex-col gap-3">
        <Button type="button" variant="primary" size="lg" onClick={onScanAnother}>
          <ScanLine aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
          <span>Escanear outro cupom</span>
        </Button>

        <Link to="/" className={buttonVariants({ variant: "sand", size: "lg" })}>
          Ir para o início
        </Link>
      </div>
    </section>
  )
}
