import type { UseFormReturn } from "react-hook-form"
import type { OtpFormValues } from "../phone"

import { useEffect, useRef } from "react"

interface OtpCredential extends Credential {
  code?: string
}

interface OtpCredentialRequestOptions extends CredentialRequestOptions {
  otp: { transport: ["sms"] }
}

/** Ouve preenchimento automático de SMS/OTP quando suportado pelo navegador. */
export function useWebOtpListener(
  active: boolean,
  phoneKey: string | undefined,
  otpForm: UseFormReturn<OtpFormValues>,
) {
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!active || typeof window === "undefined" || !("OTPCredential" in window)) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const options: OtpCredentialRequestOptions = {
      otp: { transport: ["sms"] },
      signal: controller.signal,
    }
    void navigator.credentials
      .get(options)
      .then((credential) => {
        const digits = (credential as OtpCredential | null)?.code?.replace(/\D/g, "").slice(0, 6)
        if (digits && digits.length === 6) {
          otpForm.setValue("code", digits, { shouldValidate: true })
        }
      })
      .catch(() => {})
    return () => controller.abort()
  }, [active, phoneKey, otpForm])

  return () => {
    abortRef.current?.abort()
  }
}
