import type { BaseSyntheticEvent } from "react"
import type { AuthStep, OtpFormValues, PhoneFormValues } from "../phone"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"

import { ApiError } from "@/api/client"
import { messageFor } from "@/api/messages"
import { setToken } from "@/api/token"
import { clearVoucherSession } from "@/features/rewards/voucher-store"

import { fetchMeta, requestOtp, verifyOtp } from "../api"
import {
  formatPhoneInput,
  formatPhoneOnEdit,
  normalizeReferralCode,
  otpFormSchema,
  phoneFormSchema,
} from "../phone"
import { useWebOtpListener } from "./use-web-otp"

const RESEND_COOLDOWN_SECONDS = 30

interface PendingAuth {
  phone: string
  formattedPhone: string
  name?: string
  demoCode: string | null
}

export const authKeys = {
  all: () => ["auth"] as const,
  meta: () => [...authKeys.all(), "meta"] as const,
}

export function useAuth(passo?: AuthStep, convite?: string) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [pendingAuth, setPendingAuth] = useState<PendingAuth | null>(null)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)

  const activeReferralCode = normalizeReferralCode(convite)
  const step: AuthStep = passo === "codigo" && pendingAuth !== null ? "codigo" : "telefone"
  const metaQuery = useQuery({
    queryKey: authKeys.meta(),
    queryFn: fetchMeta,
    staleTime: 5 * 60_000,
  })

  const phoneForm = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneFormSchema),
    mode: "onTouched",
    defaultValues: { name: "", phone: "" },
  })

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpFormSchema),
    mode: "onTouched",
    defaultValues: { code: "", consent: false },
  })

  const requestOtpMutation = useMutation({
    mutationFn: async (input: { phone: string; name?: string }) => ({
      response: await requestOtp({ phone: input.phone }),
      input,
    }),
    onSuccess: ({ response, input }) => {
      setPendingAuth({
        phone: input.phone,
        formattedPhone: formatPhoneInput(input.phone),
        name: input.name,
        demoCode: response.demo_code ?? null,
      })
      setCooldownSeconds(RESEND_COOLDOWN_SECONDS)
      setResendSuccess(false)
      otpForm.reset({ code: "", consent: false })
      void navigate({ to: "/entrar", search: { passo: "codigo", convite: activeReferralCode } })
    },
  })

  const resendOtpMutation = useMutation({
    mutationFn: (phone: string) => requestOtp({ phone }),
    onSuccess: (response) => {
      setPendingAuth((curr) =>
        curr ? { ...curr, demoCode: response.demo_code ?? curr.demoCode } : curr,
      )
      setCooldownSeconds(RESEND_COOLDOWN_SECONDS)
      setResendSuccess(true)
    },
  })

  const verifyOtpMutation = useMutation({
    mutationFn: async (input: {
      phone: string
      code: string
      name?: string
      referral_code?: string
    }) => {
      const data = await verifyOtp(input)
      if (!data.token) throw new ApiError("unknown_error", 500)
      return data
    },
    onSuccess: (data) => {
      if (!data.token) return
      setToken(data.token)
      clearVoucherSession()
      queryClient.clear()
      void navigate({ to: "/" })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "otp_expired") setCooldownSeconds(0)
    },
  })

  useEffect(() => {
    if (cooldownSeconds <= 0) return
    const timer = window.setInterval(() => {
      setCooldownSeconds((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldownSeconds])

  const abortWebOtp = useWebOtpListener(step === "codigo", pendingAuth?.phone, otpForm)

  const onSubmitPhone = phoneForm.handleSubmit((values) => {
    verifyOtpMutation.reset()
    resendOtpMutation.reset()
    requestOtpMutation.mutate({ phone: values.phone, name: values.name?.trim() || undefined })
  })

  const submitOtpForm = otpForm.handleSubmit((values) => {
    if (!pendingAuth) return
    setResendSuccess(false)
    resendOtpMutation.reset()
    verifyOtpMutation.mutate({
      phone: pendingAuth.phone,
      code: values.code,
      name: pendingAuth.name?.trim() || undefined,
      ...(activeReferralCode ? { referral_code: activeReferralCode } : {}),
    })
  })

  const onSubmitOtp = (event?: BaseSyntheticEvent) => {
    abortWebOtp()
    return submitOtpForm(event)
  }

  const onResendCode = () => {
    if (!pendingAuth || cooldownSeconds > 0 || resendOtpMutation.isPending) return
    abortWebOtp()
    verifyOtpMutation.reset()
    setResendSuccess(false)
    resendOtpMutation.mutate(pendingAuth.phone)
  }

  const onChangePhone = () => {
    abortWebOtp()
    verifyOtpMutation.reset()
    resendOtpMutation.reset()
    requestOtpMutation.reset()
    setResendSuccess(false)
    void navigate({ to: "/entrar", search: { passo: "telefone", convite: activeReferralCode } })
  }

  const demoMode = Boolean(metaQuery.data?.demo_mode)
  const demoCode = pendingAuth?.demoCode ?? (demoMode ? "000000" : null)
  const otpApiError = verifyOtpMutation.error ?? resendOtpMutation.error

  return {
    step,
    activeReferralCode,
    metaQuery,
    demoMode,
    demoCode,
    formattedPhone: pendingAuth?.formattedPhone ?? "",
    phoneForm,
    otpForm,
    formatPhoneField: formatPhoneOnEdit,
    onSubmitPhone,
    onSubmitOtp,
    onResendCode,
    onChangePhone,
    phoneError: requestOtpMutation.isError ? messageFor(requestOtpMutation.error) : null,
    otpError: otpApiError ? messageFor(otpApiError) : null,
    isRequestingOtp: requestOtpMutation.isPending,
    isVerifyingOtp: verifyOtpMutation.isPending,
    isResendingOtp: resendOtpMutation.isPending,
    cooldownSeconds,
    resendSuccess,
    privacyOpen,
    setPrivacyOpen,
  }
}
