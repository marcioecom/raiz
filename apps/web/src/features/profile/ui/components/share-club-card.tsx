import { Check, Copy, Share2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface ShareClubCardProps {
  clubUrl: string
  referralCode?: string
  feedback: { tone: "success" | "error"; text: string } | null
  onCopy: () => void
  onShare: () => void
}

/** Card para compartilhar o convite real (quando disponível) ou acesso geral do clube. */
export function ShareClubCard({
  clubUrl,
  referralCode,
  feedback,
  onCopy,
  onShare,
}: ShareClubCardProps) {
  const isCopied = feedback?.tone === "success" && feedback.text.startsWith("Link do clube copiado")

  return (
    <Card variant="sand" className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold leading-6 tracking-[-0.01em] text-ink">
            Traga alguém
          </h2>
          <p className="text-[15px] leading-[22px] text-ink-muted">
            {referralCode
              ? "Quem entrar pelo seu link e validar o 1º cupom fiscal gera +100 sementes para você e para quem foi convidado."
              : "Compartilhe o acesso do clube com quem costuma visitar o Capim Dourado Shopping."}
          </p>
        </div>
        {referralCode && <Badge variant="gold">+100 sementes</Badge>}
      </div>

      {referralCode && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3.5 py-2.5">
          <span className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
            Seu código
          </span>
          <span className="select-all font-mono text-base font-bold tracking-[0.14em] text-ink">
            {referralCode}
          </span>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card px-3.5 py-2.5">
        <p className="truncate font-mono text-[13px] font-medium leading-[18px] text-ink select-all">
          {clubUrl}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-2">
        <Button type="button" variant="primary" size="default" className="w-full" onClick={onCopy}>
          {isCopied ? (
            <Check aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          ) : (
            <Copy aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          )}
          <span>Copiar link</span>
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="default"
          className="w-full text-forest"
          onClick={onShare}
        >
          <Share2 aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span>Compartilhar</span>
        </Button>
      </div>

      <p
        role="status"
        className={cn(
          "min-h-5 text-[13px] font-medium leading-[18px]",
          feedback?.tone === "error" ? "text-error" : "text-success",
        )}
      >
        {feedback?.text ?? ""}
      </p>
    </Card>
  )
}
