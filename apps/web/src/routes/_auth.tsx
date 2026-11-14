import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

import { hasToken } from "@/api/token"

export const Route = createFileRoute("/_auth")({
  beforeLoad: () => {
    if (hasToken()) {
      throw redirect({ to: "/" })
    }
  },
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[448px] flex-col bg-canvas px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] min-[449px]:border-x min-[449px]:border-border lg:max-w-[1040px] lg:justify-center lg:border-x-0 lg:bg-transparent lg:px-8 lg:py-10">
      <a href="#main-content" className="skip-link visually-hidden focus-on-forest">
        Pular para o conteúdo
      </a>
      <main
        id="main-content"
        tabIndex={-1}
        className="flex flex-1 flex-col outline-none lg:flex-none"
      >
        <Outlet />
      </main>
    </div>
  )
}
