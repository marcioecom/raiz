import type { Control } from "react-hook-form"
import type { OtpFormValues } from "../../phone"

import { ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

const PRIVACY_BULLETS = [
  "Guardamos apenas seu nome e telefone para somar sementes e validar resgates.",
  "Não pedimos senha e não coletamos GPS, contatos ou dados de cartão.",
  "Se o cupom fiscal trouxer CPF, ele é descartado na hora e nunca é salvo.",
  "Você pode baixar seus dados ou apagar sua conta a qualquer momento em Perfil.",
]

export interface OtpConsentFieldProps {
  control: Control<OtpFormValues>
  disabled: boolean
  onOpenPrivacy: () => void
}

/** Checkbox explícito de consentimento LGPD com resumo acessível via diálogo nativo. */
export function OtpConsentField({ control, disabled, onOpenPrivacy }: OtpConsentFieldProps) {
  return (
    <FormField
      control={control}
      name="consent"
      render={({ field }) => (
        <FormItem className="rounded-xl border border-border bg-canvas p-3">
          <FormLabel className="flex min-h-11 cursor-pointer items-start gap-2 text-[14px] font-normal leading-5 text-ink">
            <span className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center">
              <FormControl>
                <input
                  type="checkbox"
                  name={field.name}
                  ref={field.ref}
                  checked={field.value}
                  onBlur={field.onBlur}
                  onChange={(e) => field.onChange(e.target.checked)}
                  disabled={disabled}
                  required
                  className="h-5 w-5 cursor-pointer rounded border border-control-border accent-forest"
                />
              </FormControl>
            </span>
            <span className="py-1.5">
              Aceito usar meu nome e telefone apenas para identificar meus cupons e liberar
              benefícios no Capim Dourado Shopping.
            </span>
          </FormLabel>
          <FormMessage className="pl-11" />
          <div className="pl-11">
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-forest underline underline-offset-4 hover:text-ink"
            >
              <ShieldCheck aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
              Ler resumo de privacidade
            </button>
          </div>
        </FormItem>
      )}
    />
  )
}

export interface PrivacySummaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Diálogo nativo com resumo LGPD exibido antes da confirmação do código OTP. */
export function PrivacySummaryDialog({ open, onOpenChange }: PrivacySummaryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} closedby="any">
      <DialogHeader>
        <DialogTitle>Resumo de privacidade (LGPD)</DialogTitle>
        <DialogDescription>
          Transparência sobre o que o Raiz coleta no Capim Dourado Shopping.
        </DialogDescription>
      </DialogHeader>
      <ul className="flex list-disc flex-col gap-2 pl-5 text-[15px] leading-[22px] text-ink">
        {PRIVACY_BULLETS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <DialogFooter>
        <Button type="button" variant="primary" size="lg" onClick={() => onOpenChange(false)}>
          Entendi
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
