import { Check, Copy, Share2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface ShareClubCardProps {
  clubUrl: string
  feedback: { tone: "success" | "error"; text: string } | null
  onCopy: () => void
  onShare: () => void
}

/** Card para compartilhar o link do clube sem código ou parâmetro de indicação inventado. */
export function ShareClubCard({ clubUrl, feedback, onCopy, onShare }: ShareClubCardProps) {
  const isCopied = feedback?.tone === "success" && feedback.text.startsWith("Link do clube copiado")

  return (
    <Card variant="sand" className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold leading-6 tracking-[-0.01em] text-ink">
          Traga alguém
        </h2>
        <p className="text-[15px] leading-[22px] text-ink-muted">
          Compartilhe o acesso do clube com quem costuma visitar o Capim Dourado Shopping.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card px-3.5 py-2.5">
        <p className="truncate font-mono text-[13px] font-medium leading-[18px] text-ink select-all">
          {clubUrl}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Button variant="primary" size="default" className="w-full" onClick={onCopy}>
          {isCopied ? (
            <Check aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          ) : (
            <Copy aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          )}
          <span>Copiar link</span>
        </Button>

        <Button variant="secondary" size="default" className="w-full text-forest" onClick={onShare}>
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
