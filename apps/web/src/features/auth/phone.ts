import { z } from "zod"

/**
 * Remove caracteres não numéricos e o DDI 55 inicial quando o visitante cola um
 * número completo do Brasil com 12 ou 13 dígitos.
 */
export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "")
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    return digits.slice(2)
  }
  return digits
}

/**
 * Formata telefone brasileiro para exibição legível no campo sem prender o cursor
 * em delimitadores finais durante a edição.
 */
export function formatPhoneInput(value: string): string {
  const digits = normalizePhone(value).slice(0, 11)
  if (digits.length === 0) {
    return ""
  }
  if (digits.length <= 2) {
    return `(${digits}`
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

/**
 * Aplica a máscara durante a digitação preservando números de DDD 55 quando o
 * visitante já digitou 11 dígitos e pressiona uma tecla extra.
 */
export function formatPhoneOnEdit(rawValue: string, previousValue: string): string {
  const prevDigits = previousValue.replace(/\D/g, "")
  const nextDigits = rawValue.replace(/\D/g, "")
  const typingPastLimit =
    prevDigits.length === 11 && nextDigits.length === 12 && !rawValue.includes("+")
  return typingPastLimit ? formatPhoneInput(prevDigits) : formatPhoneInput(rawValue)
}

export const phoneSchema = z
  .string()
  .transform(normalizePhone)
  .superRefine((digits, ctx) => {
    if (digits.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe seu telefone com DDD.",
      })
      return
    }
    if (digits.length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe o telefone com DDD (10 ou 11 dígitos).",
      })
      return
    }
    if (digits.length > 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Confira o número. Informe apenas DDD e telefone.",
      })
      return
    }
    if (!/^[1-9]{2}$/.test(digits.slice(0, 2))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "DDD inválido. Confira os dois primeiros dígitos.",
      })
    }
  })

export const visitorNameSchema = z
  .string()
  .trim()
  .refine(
    (value) => value.length === 0 || value.length >= 2,
    "Informe pelo menos 2 letras ou deixe em branco se já tiver conta.",
  )
  .refine((value) => value.length <= 80, "Use no máximo 80 caracteres para o seu nome.")
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional()

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Digite os 6 dígitos do código enviado.")

export const phoneFormSchema = z.object({
  name: visitorNameSchema,
  phone: phoneSchema,
})

export const otpFormSchema = z.object({
  code: otpCodeSchema,
  consent: z
    .boolean()
    .refine((accepted) => accepted, "Marque a caixa de aceite para entrar no Raiz."),
})

export const authSearchSchema = z.object({
  passo: z.enum(["telefone", "codigo"]).optional().catch(undefined),
})

export type PhoneFormValues = z.input<typeof phoneFormSchema>
export type PhoneFormOutput = z.output<typeof phoneFormSchema>
export type OtpFormValues = z.input<typeof otpFormSchema>
export type AuthStep = "telefone" | "codigo"
