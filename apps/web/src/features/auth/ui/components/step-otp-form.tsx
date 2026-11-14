import type { BaseSyntheticEvent } from "react"
import type { UseFormReturn } from "react-hook-form"
import type { OtpFormValues } from "../../phone"

import { ArrowLeft, Info } from "lucide-react"
import { useEffect, useId, useRef } from "react"

import { DemoBadge } from "@/components/demo-badge"
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

import { OtpConsentField } from "./privacy-summary-dialog"

export interface StepOtpFormProps {
  form: UseFormReturn<OtpFormValues>
  formattedPhone: string
  demoCode: string | null
  onSubmit: (event?: BaseSyntheticEvent) => void
  onChangePhone: () => void
  onResendCode: () => void
  cooldownSeconds: number
  resendSuccess: boolean
  isPending: boolean
  isResending: boolean
  apiError: string | null
  onOpenPrivacy: () => void
}

export function StepOtpForm({
  form,
  formattedPhone,
  demoCode,
  onSubmit,
  onChangePhone,
  onResendCode,
  cooldownSeconds,
  resendSuccess,
  isPending,
  isResending,
  apiError,
  onOpenPrivacy,
}: StepOtpFormProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const headingId = useId()
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <Card variant="surface" className="p-5 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h2
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            className="text-lg font-semibold leading-6 text-ink"
          >
            Confirmar código
          </h2>
          <p className="mt-0.5 text-[13px] font-medium leading-[18px] text-ink-muted">
            Enviado para{" "}
            <strong className="font-semibold text-ink tabular-nums">{formattedPhone}</strong>
          </p>
        </div>
        <button
          type="button"
          onClick={onChangePhone}
          disabled={isPending}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold text-forest underline underline-offset-4 hover:bg-sand disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
          Alterar telefone
        </button>
      </div>

      {demoCode && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-demo-border bg-demo-soft px-3.5 py-2.5 text-demo">
          <Info aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <DemoBadge />
          <span className="text-[13px] font-medium leading-[18px]">
            Use o código{" "}
            <strong className="font-mono font-bold tracking-wider tabular-nums">{demoCode}</strong>
          </span>
        </div>
      )}

      <Form {...form}>
        <form
          method="POST"
          aria-labelledby={headingId}
          noValidate
          onSubmit={onSubmit}
          className="mt-4 flex flex-col gap-4"
        >
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código de verificação</FormLabel>
                <FormDescription>Código de 6 dígitos enviado no WhatsApp</FormDescription>
                <FormControl>
                  <Input
                    {...field}
                    type="text"
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    enterKeyHint="done"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    placeholder="000000"
                    disabled={isPending}
                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="h-[52px] bg-canvas text-center font-mono text-2xl font-bold leading-8 tracking-[0.35em] tabular-nums placeholder:tracking-[0.35em] placeholder:text-ink-muted/40"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onResendCode}
              disabled={cooldownSeconds > 0 || isPending}
              loading={isResending}
              loadingText="Reenviando..."
            >
              {cooldownSeconds > 0 ? (
                <span className="tabular-nums">Reenviar código em {cooldownSeconds}s</span>
              ) : (
                "Reenviar código"
              )}
            </Button>
            {resendSuccess && (
              <p role="status" className="text-[13px] font-medium text-success">
                Novo código enviado.
              </p>
            )}
          </div>

          <OtpConsentField
            control={form.control}
            disabled={isPending}
            onOpenPrivacy={onOpenPrivacy}
          />

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
            loadingText="Confirmando..."
          >
            Confirmar e entrar
          </Button>
        </form>
      </Form>
    </Card>
  )
}
