import type { AuthStep } from "../../phone"

import { RaizLogo } from "@/components/raiz-logo"
import { Button } from "@/components/ui/button"

import { useAuth } from "../../hooks/use-auth"
import { StepOtpForm } from "../components/step-otp-form"
import { StepPhoneForm } from "../components/step-phone-form"

export interface LoginViewProps {
  passo?: AuthStep
}

export function LoginView({ passo }: LoginViewProps) {
  const auth = useAuth(passo)

  return (
    <section className="flex flex-1 flex-col justify-between gap-6 pt-2">
      <div className="flex flex-col gap-5">
        <header className="flex flex-col items-center gap-2 text-center">
          <RaizLogo />
          <h1 className="mt-1 text-2xl font-bold leading-[30px] tracking-[-0.015em] text-ink">
            Entrar no Raiz
          </h1>
          <p className="font-serif text-[22px] leading-7 text-forest">Quem volta, cria raiz.</p>
          <p className="text-[13px] font-medium leading-[18px] text-ink-muted">
            Capim Dourado Shopping · Palmas-TO
          </p>
        </header>

        {auth.metaQuery.isError && auth.step === "telefone" && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5"
          >
            <p className="text-[13px] font-medium leading-[18px] text-ink-muted">
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
            privacyOpen={auth.privacyOpen}
            onPrivacyOpenChange={auth.setPrivacyOpen}
          />
        )}
      </div>

      <footer className="pb-1 pt-2 text-center">
        <p className="text-xs font-medium leading-4 text-ink-muted">
          Raiz Fidelidade · Capim Dourado Shopping
        </p>
      </footer>
    </section>
  )
}
