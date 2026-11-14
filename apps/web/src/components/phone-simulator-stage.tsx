import { useEffect, useRef, useState } from "react"

import { parsePhoneRouteMessage, PHONE_FRAME_NAME } from "@/components/device-preview"
import { DevicePreviewToggle } from "@/components/device-preview-toggle"
import { RaizLogo } from "@/components/raiz-logo"

export interface PhoneSimulatorStageProps {
  initialSrc: string
  onExit: () => void
  onRouteSync: (href: string) => void
}

function formatClockTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function PhoneStatusChrome() {
  const [clockLabel, setClockLabel] = useState(() => formatClockTime(new Date()))

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockLabel(formatClockTime(new Date()))
    }, 30_000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div
      aria-hidden="true"
      className="relative flex h-10 shrink-0 select-none items-center justify-between border-b border-border/35 bg-canvas px-6"
    >
      <span className="font-mono text-[11px] font-semibold tracking-tight text-ink tabular-nums">
        {clockLabel}
      </span>

      <div className="absolute left-1/2 top-2 flex h-6 w-[98px] -translate-x-1/2 items-center justify-end rounded-full bg-ink px-2.5 shadow-inner">
        <span className="h-2.5 w-2.5 rounded-full bg-[#1C3328] ring-1 ring-white/15" />
      </div>

      <div className="flex items-center gap-1.5 text-ink">
        <svg className="h-3 w-3.5" viewBox="0 0 16 12" fill="currentColor">
          <rect x="0" y="8" width="2.5" height="4" rx="0.75" />
          <rect x="4" y="5.5" width="2.5" height="6.5" rx="0.75" />
          <rect x="8" y="3" width="2.5" height="9" rx="0.75" />
          <rect x="12" y="0.5" width="2.5" height="11.5" rx="0.75" />
        </svg>
        <svg className="h-3 w-5" viewBox="0 0 22 12" fill="none">
          <rect
            x="0.75"
            y="1.25"
            width="17.5"
            height="9.5"
            rx="2.5"
            stroke="currentColor"
            strokeWidth="1.25"
          />
          <rect x="2.5" y="3" width="14" height="6" rx="1" fill="currentColor" />
          <path d="M20 4.25V7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}

export function PhoneSimulatorStage({ initialSrc, onExit, onRouteSync }: PhoneSimulatorStageProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) {
        return
      }
      const nextHref = parsePhoneRouteMessage(event.data, event.origin, window.location.origin)
      if (nextHref) {
        onRouteSync(nextHref)
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [onRouteSync])

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-between gap-2.5 bg-sand px-6 py-3">
      <a href="#phone-preview-iframe" className="skip-link visually-hidden focus-on-forest">
        Ir para a tela do celular
      </a>

      <header className="flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-2">
        <div className="flex items-center gap-3">
          <RaizLogo interactive={false} />
          <span className="hidden rounded-full border border-border bg-sand px-3 py-1 font-mono text-xs font-medium text-ink-muted tabular-nums sm:inline-flex">
            Simulação mobile · 390 px
          </span>
        </div>

        <DevicePreviewToggle active onToggle={onExit} variant="toolbar" />
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="flex flex-1 items-center justify-center outline-none"
      >
        <h1 className="visually-hidden">Visualização simulada do Raiz em formato celular</h1>

        <div className="relative rounded-[50px] bg-ink p-[11px] shadow-[0_24px_60px_rgba(22,36,29,0.28),0_6px_16px_rgba(22,36,29,0.16)] ring-1 ring-ink/90">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-[2px] rounded-[48px] border border-white/12"
          />

          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-[3px] top-24 h-7 w-[3px] rounded-l-sm bg-control-border/80"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-[3px] top-36 h-12 w-[3px] rounded-l-sm bg-control-border/80"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-[3px] top-[200px] h-12 w-[3px] rounded-l-sm bg-control-border/80"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-[3px] top-40 h-16 w-[3px] rounded-r-sm bg-control-border/80"
          />

          <div className="relative flex w-[390px] flex-col overflow-hidden rounded-[39px] bg-canvas ring-1 ring-black/40">
            <PhoneStatusChrome />

            <iframe
              id="phone-preview-iframe"
              ref={iframeRef}
              name={PHONE_FRAME_NAME}
              src={initialSrc}
              title="Visualização simulada do Raiz em formato celular"
              allow="camera; clipboard-write"
              className="block h-[clamp(380px,calc(100dvh-224px),740px)] w-[390px] border-0 bg-canvas"
            />

            <div
              aria-hidden="true"
              className="flex h-6 shrink-0 select-none items-center justify-center border-t border-border/30 bg-card"
            >
              <span className="h-1 w-32 rounded-full bg-ink/25" />
            </div>
          </div>
        </div>
      </main>

      <p className="text-center text-xs font-medium text-ink-muted">
        Navegue dentro da tela simulada como em um celular ou volte ao layout desktop quando quiser.
      </p>
    </div>
  )
}
