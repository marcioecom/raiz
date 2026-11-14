import type { BaseSyntheticEvent } from "react"
import type { UseFormReturn } from "react-hook-form"
import type { DecodedAccessKey } from "../../access-key"
import type { ManualKeyFormValues } from "../../types"

import { CircleHelp, ClipboardPaste, Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import { AccessKeyHelpDialog, AccessKeyPreviewCard } from "./access-key-help-dialog"

export interface ManualKeyFormProps {
  form: UseFormReturn<ManualKeyFormValues>
  chunks: string[]
  digitsCount: number
  decodedPreview: DecodedAccessKey | null
  isPending: boolean
  apiError: string | null
  helpOpen: boolean
  onHelpOpenChange: (open: boolean) => void
  onFormatChange: (rawValue: string) => string
  onPasteClick: () => void
  onSubmit: (event?: BaseSyntheticEvent) => void
}

export function ManualKeyForm({
  form,
  chunks,
  digitsCount,
  decodedPreview,
  isPending,
  apiError,
  helpOpen,
  onHelpOpenChange,
  onFormatChange,
  onPasteClick,
  onSubmit,
}: ManualKeyFormProps) {
  return (
    <>
      <section aria-label="Digitação manual da chave NFC-e" className="flex flex-col gap-3">
        <Card variant="surface" className="p-4">
          <Form {...form}>
            <form method="POST" noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="accessKey"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between gap-2">
                      <FormLabel>Chave de acesso da NFC-e (44 dígitos)</FormLabel>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onPasteClick}
                        disabled={isPending}
                        className="min-h-11 min-w-11 px-2.5 text-[13px] font-semibold text-gold-text"
                      >
                        <ClipboardPaste aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
                        <span>Colar</span>
                      </Button>
                    </div>
                    <FormDescription>
                      Digite ou cole os 44 números impressos abaixo do QR Code no cupom fiscal.
                    </FormDescription>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        name="accessKey"
                        inputMode="numeric"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        enterKeyHint="done"
                        required
                        pattern={"(?:\\d\\s*){44}"}
                        placeholder="0000 0000 0000 0000..."
                        disabled={isPending}
                        onChange={(event) => field.onChange(onFormatChange(event.target.value))}
                        className="bg-canvas font-mono text-base font-medium leading-6 tracking-wider tabular-nums"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <AccessKeyPreviewCard
                chunks={chunks}
                digitsCount={digitsCount}
                decodedPreview={decodedPreview}
              />

              <div className="flex items-start gap-2 text-ink-muted">
                <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                <p className="text-[13px] leading-[18px]">
                  Cupom já usado não pontua. Se o CNPJ for novo, as sementes base entram na hora.
                </p>
              </div>

              {apiError && (
                <div
                  role="alert"
                  className="rounded-xl border border-error bg-error-soft px-3.5 py-2.5 text-sm font-medium leading-5 text-error"
                >
                  {apiError}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isPending}
                loadingText="Validando cupom..."
              >
                Registrar cupom
              </Button>
            </form>
          </Form>
        </Card>

        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-[13px] font-medium leading-[18px] text-ink-muted">
            Não achou os números?
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onHelpOpenChange(true)}
            className="min-h-11 px-2 text-[13px] font-semibold text-forest underline underline-offset-4"
          >
            <CircleHelp aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
            <span>Onde encontrar a chave no cupom?</span>
          </Button>
        </div>
      </section>

      <AccessKeyHelpDialog open={helpOpen} onOpenChange={onHelpOpenChange} />
    </>
  )
}
