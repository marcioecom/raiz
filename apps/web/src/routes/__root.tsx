import type { RouterContext } from "@/router"
import type { ErrorComponentProps } from "@tanstack/react-router"

import { createRootRouteWithContext, Link, Outlet, useRouter } from "@tanstack/react-router"

import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"
import { buttonVariants } from "@/components/ui/button"

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: RootErrorComponent,
  notFoundComponent: RootNotFoundComponent,
})

function RootLayout() {
  return <Outlet />
}

function RootErrorComponent({ reset }: ErrorComponentProps) {
  const router = useRouter()

  const handleRetry = () => {
    reset()
    void router.invalidate()
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[448px] flex-col justify-center bg-canvas px-4 py-8 min-[449px]:border-x min-[449px]:border-border lg:my-12 lg:min-h-0 lg:max-w-[640px] lg:rounded-2xl lg:border lg:p-10">
      <a href="#main-content" className="skip-link visually-hidden focus-on-forest">
        Pular para o conteúdo
      </a>
      <main id="main-content" tabIndex={-1} className="outline-none">
        <h1 className="visually-hidden">Erro ao carregar conteúdo</h1>
        <ErrorState onRetry={handleRetry} />
      </main>
    </div>
  )
}

function RootNotFoundComponent() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[448px] flex-col justify-center bg-canvas px-4 py-8 min-[449px]:border-x min-[449px]:border-border lg:my-12 lg:min-h-0 lg:max-w-[640px] lg:rounded-2xl lg:border lg:p-10">
      <a href="#main-content" className="skip-link visually-hidden focus-on-forest">
        Pular para o conteúdo
      </a>
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
