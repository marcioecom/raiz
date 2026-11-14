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
    <div className="mx-auto flex min-h-dvh w-full max-w-[448px] flex-col bg-canvas px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] min-[449px]:border-x min-[449px]:border-border">
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  )
}
