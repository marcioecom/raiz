import type { RouterContext } from "@/router"
import type { ErrorComponentProps } from "@tanstack/react-router"

import {
  createRootRouteWithContext,
  Link,
  Outlet,
  useRouter,
  useRouterState,
} from "@tanstack/react-router"
import { useEffect } from "react"

import { PHONE_ROUTE_MESSAGE_TYPE } from "@/components/device-preview"
import { DevicePreviewToggle } from "@/components/device-preview-toggle"
import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"
import { buttonVariants } from "@/components/ui/button"
import { useDevicePreview } from "@/components/use-device-preview"

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: RootErrorComponent,
  notFoundComponent: RootNotFoundComponent,
})

function PhoneFrameRouteSync() {
  const href = useRouterState({
    select: (state) => state.location.href,
  })

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    window.parent.postMessage({ type: PHONE_ROUTE_MESSAGE_TYPE, href }, window.location.origin)
  }, [href])

  return null
}

function RootLayout() {
  const { isInsideFrame } = useDevicePreview()

  return (
    <>
      {isInsideFrame && <PhoneFrameRouteSync />}
      <Outlet />
    </>
  )
}

function RootErrorComponent({ reset }: ErrorComponentProps) {
  const router = useRouter()
  const { isInsideFrame, canTogglePhonePreview, togglePhonePreview } = useDevicePreview()

  const handleRetry = () => {
    reset()
    void router.invalidate()
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[448px] flex-col justify-center bg-canvas px-4 py-8 min-[449px]:border-x min-[449px]:border-border lg:my-12 lg:min-h-0 lg:max-w-[640px] lg:rounded-2xl lg:border lg:p-10">
      {isInsideFrame && <PhoneFrameRouteSync />}
      <a href="#main-content" className="skip-link visually-hidden focus-on-forest">
        Pular para o conteúdo
      </a>
      {canTogglePhonePreview && (
        <div className="hidden lg:mb-6 lg:flex lg:justify-end">
          <DevicePreviewToggle active={false} onToggle={togglePhonePreview} />
        </div>
      )}
      <main id="main-content" tabIndex={-1} className="outline-none">
        <h1 className="visually-hidden">Erro ao carregar conteúdo</h1>
        <ErrorState onRetry={handleRetry} />
      </main>
    </div>
  )
}

function RootNotFoundComponent() {
  const { isInsideFrame, canTogglePhonePreview, togglePhonePreview } = useDevicePreview()

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[448px] flex-col justify-center bg-canvas px-4 py-8 min-[449px]:border-x min-[449px]:border-border lg:my-12 lg:min-h-0 lg:max-w-[640px] lg:rounded-2xl lg:border lg:p-10">
      {isInsideFrame && <PhoneFrameRouteSync />}
      <a href="#main-content" className="skip-link visually-hidden focus-on-forest">
        Pular para o conteúdo
      </a>
      {canTogglePhonePreview && (
        <div className="hidden lg:mb-6 lg:flex lg:justify-end">
          <DevicePreviewToggle active={false} onToggle={togglePhonePreview} />
        </div>
      )}
      <main id="main-content" tabIndex={-1} className="outline-none">
        <h1 className="visually-hidden">Página não encontrada</h1>
        <EmptyState
          title="Página não encontrada"
          description="Este caminho não existe no Raiz. Volte para o painel inicial para continuar."
          action={
            <Link to="/" className={buttonVariants({ variant: "primary" })}>
              Ir para o início
            </Link>
          }
        />
      </main>
    </div>
  )
}
