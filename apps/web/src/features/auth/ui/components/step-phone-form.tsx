import type { BaseSyntheticEvent } from "react"
import type { UseFormReturn } from "react-hook-form"
import type { PhoneFormValues } from "../../phone"

import { useId } from "react"

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

export interface StepPhoneFormProps {
  form: UseFormReturn<PhoneFormValues>
  onSubmit: (event?: BaseSyntheticEvent) => void
  onFormatPhone: (rawValue: string, previousValue: string) => string
  isPending: boolean
  apiError: string | null
  demoMode: boolean
}

export function StepPhoneForm({
  form,
  onSubmit,
  onFormatPhone,
  isPending,
  apiError,
  demoMode,
}: StepPhoneFormProps) {
  const headingId = useId()

  return (
    <Card variant="surface" className="p-5 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="text-lg font-semibold leading-6 tracking-[-0.01em] text-ink">
          Seus dados de acesso
        </h2>
        {demoMode && <DemoBadge />}
      </div>

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
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Seu nome{" "}
                  <span className="font-normal text-ink-muted">(opcional se já tiver conta)</span>
                </FormLabel>
                <FormDescription>
                  Obrigatório apenas no primeiro acesso, entre 2 e 80 caracteres.
                </FormDescription>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    type="text"
                    name="name"
                    autoComplete="name"
                    enterKeyHint="next"
                    maxLength={80}
                    placeholder="Ex.: Ana Clara"
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Seu telefone</FormLabel>
                <FormDescription>DDD + número, ex.: (63) 99999-9999</FormDescription>
                <FormControl>
                  <Input
                    {...field}
                    type="tel"
                    name="phone"
                    inputMode="tel"
                    autoComplete="tel"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    enterKeyHint="done"
                    required
                    placeholder="(63) 99999-9999"
                    disabled={isPending}
                    onChange={(event) => {
                      field.onChange(onFormatPhone(event.target.value, field.value))
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
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
            loadingText="Enviando..."
            className="mt-1"
          >
            Receber código no WhatsApp
          </Button>
        </form>
      </Form>

      <p className="mt-4 text-center text-[13px] font-medium leading-[18px] text-ink-muted">
        Sem senha. Sem app. Pedimos apenas nome e telefone.
      </p>
    </Card>
  )
}
