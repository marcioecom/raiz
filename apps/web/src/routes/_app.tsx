import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router"

import { hasToken } from "@/api/token"
import { AppShell } from "@/components/app-shell"
import {
  BottomBarVisibilityProvider,
  useBottomBarOverlayHidden,
} from "@/components/bottom-bar-context"
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton"

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    if (!hasToken()) {
      throw redirect({ to: "/entrar" })
    }
  },
  pendingComponent: AppPendingShell,
  component: AppLayout,
})

function AppPendingShell() {
  return (
    <AppShell currentPath="/" showBottomBar={false}>
      <SkeletonGroup label="Carregando conteúdo" className="pt-2">
        <Skeleton className="h-8 w-40 lg:w-56" />
        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-12 lg:gap-6">
          <Skeleton className="h-32 w-full rounded-2xl lg:col-span-7 lg:h-48" />
          <Skeleton className="h-24 w-full rounded-2xl lg:col-span-5 lg:h-48" />
        </div>
      </SkeletonGroup>
    </AppShell>
  )
}

function AppLayoutContent() {
  const currentPath = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isOverlayHidden = useBottomBarOverlayHidden()

  const hiddenByRoute =
    currentPath.startsWith("/scan") ||
    (currentPath.startsWith("/premios/") && currentPath !== "/premios/")

  return (
    <AppShell currentPath={currentPath} showBottomBar={!hiddenByRoute && !isOverlayHidden}>
      <Outlet />
    </AppShell>
  )
}

function AppLayout() {
  return (
    <BottomBarVisibilityProvider>
      <AppLayoutContent />
    </BottomBarVisibilityProvider>
  )
}
