import type { AuthStep } from "../../phone"

import { Gift } from "lucide-react"

import { RaizLogo } from "@/components/raiz-logo"
import { Button } from "@/components/ui/button"

import { useAuth } from "../../hooks/use-auth"
import { AuthEditorialAside } from "../components/auth-editorial-aside"
import { PrivacySummaryDialog } from "../components/privacy-summary-dialog"
import { StepOtpForm } from "../components/step-otp-form"
import { StepPhoneForm } from "../components/step-phone-form"

export interface LoginViewProps {
  passo?: AuthStep
  convite?: string
}

export function LoginView({ passo, convite }: LoginViewProps) {
  const auth = useAuth(passo, convite)

  return (
    <section className="flex flex-1 flex-col justify-between gap-6 pt-2 lg:flex-none lg:grid lg:grid-cols-[1fr_420px] lg:items-center lg:gap-10 lg:rounded-3xl lg:border lg:border-border lg:bg-canvas lg:p-10">
      <AuthEditorialAside onOpenPrivacy={() => auth.setPrivacyOpen(true)} />

      <div className="flex min-w-0 flex-col gap-5 lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:p-6">
        <header className="flex flex-col items-center gap-2 text-center lg:items-start lg:border-b lg:border-border/70 lg:pb-4 lg:text-left">
          <div className="flex lg:hidden">
            <RaizLogo />
          </div>
          <h1 className="mt-1 text-2xl font-bold leading-[30px] tracking-[-0.015em] text-ink lg:mt-0">
            Entrar no Raiz
          </h1>
          <p className="font-serif text-[22px] leading-7 text-forest lg:hidden">
            Quem volta, cria raiz.
          </p>
          <p className="text-[13px] font-medium leading-[18px] text-ink-muted lg:hidden">
            Capim Dourado Shopping · Palmas-TO
          </p>
        </header>

        {auth.activeReferralCode && (
          <div className="flex items-start gap-2.5 rounded-xl border border-border bg-gold-soft px-3.5 py-2.5">
            <Gift
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-gold-text"
              strokeWidth={1.75}
            />
            <div className="flex min-w-0 flex-col gap-0.5 text-[13px] leading-[18px]">
              <p className="font-semibold text-ink">
                Convite <span className="font-mono text-gold-text">{auth.activeReferralCode}</span>{" "}
                aplicado
              </p>
              <p className="font-medium text-ink-muted">
                Ao validar seu 1º cupom fiscal no Raiz, você e quem convidou ganham 100 sementes.
              </p>
            </div>
          </div>
        )}

        {auth.metaQuery.isError && auth.step === "telefone" && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5 lg:bg-canvas">
            <p role="status" className="text-[13px] font-medium leading-[18px] text-ink-muted">
              Não foi possível consultar o servidor agora.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void auth.metaQuery.refetch()}
            >
              Tentar de novo
            </Button>
          </div>
        )}

        {auth.step === "telefone" ? (
          <StepPhoneForm
            form={auth.phoneForm}
            onSubmit={auth.onSubmitPhone}
            onFormatPhone={auth.formatPhoneField}
            isPending={auth.isRequestingOtp}
            apiError={auth.phoneError}
            demoMode={auth.demoMode}
          />
        ) : (
          <StepOtpForm
            form={auth.otpForm}
            formattedPhone={auth.formattedPhone}
            demoCode={auth.demoCode}
            onSubmit={auth.onSubmitOtp}
            onChangePhone={auth.onChangePhone}
            onResendCode={auth.onResendCode}
            cooldownSeconds={auth.cooldownSeconds}
            resendSuccess={auth.resendSuccess}
            isPending={auth.isVerifyingOtp}
            isResending={auth.isResendingOtp}
            apiError={auth.otpError}
            onOpenPrivacy={() => auth.setPrivacyOpen(true)}
          />
        )}
      </div>

      <footer className="pb-1 pt-2 text-center lg:hidden">
        <p className="text-xs font-medium leading-4 text-ink-muted">
          Raiz Fidelidade · Capim Dourado Shopping
        </p>
      </footer>

      <PrivacySummaryDialog open={auth.privacyOpen} onOpenChange={auth.setPrivacyOpen} />
    </section>
  )
}
