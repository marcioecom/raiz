import type { LucideIcon } from "lucide-react"

import { Link } from "@tanstack/react-router"
import { Gift, Home, ListChecks, ScanLine, User, Wallet } from "lucide-react"

import { DevicePreviewToggle } from "@/components/device-preview-toggle"
import { RaizLogo } from "@/components/raiz-logo"
import { buttonVariants } from "@/components/ui/button"
import { useDevicePreview } from "@/components/use-device-preview"
import { cn } from "@/lib/utils"

interface SidebarNavItem {
  to: "/" | "/missoes" | "/premios" | "/carteira" | "/perfil"
  label: string
  icon: LucideIcon
  match: (pathname: string) => boolean
}

const NAV_ITEMS: SidebarNavItem[] = [
  {
    to: "/",
    label: "Início",
    icon: Home,
    match: (pathname) => pathname === "/",
  },
  {
    to: "/missoes",
    label: "Missões",
    icon: ListChecks,
    match: (pathname) => pathname.startsWith("/missoes"),
  },
  {
    to: "/premios",
    label: "Prêmios",
    icon: Gift,
    match: (pathname) => pathname.startsWith("/premios"),
  },
  {
    to: "/carteira",
    label: "Carteira",
    icon: Wallet,
    match: (pathname) => pathname.startsWith("/carteira"),
  },
  {
    to: "/perfil",
    label: "Perfil",
    icon: User,
    match: (pathname) => pathname.startsWith("/perfil"),
  },
]

export interface DesktopSidebarProps {
  currentPath: string
}

export function DesktopSidebar({ currentPath }: DesktopSidebarProps) {
  const scanActive = currentPath.startsWith("/scan")
  const { canTogglePhonePreview, togglePhonePreview } = useDevicePreview()

  return (
    <aside
      aria-label="Barra lateral de navegação"
      className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col lg:justify-between lg:overflow-y-auto lg:border-r lg:border-border lg:bg-card lg:p-5"
    >
      <div>
        <div className="flex items-center justify-between gap-2 border-b border-border/70 pb-4">
          <RaizLogo />
        </div>

        <Link
          to="/scan"
          aria-current={scanActive ? "page" : undefined}
          className={cn(
            buttonVariants({ variant: "primary", size: "lg" }),
            "mt-5 w-full justify-center gap-2 rounded-xl min-h-12 font-semibold",
            scanActive && "ring-2 ring-gold ring-offset-2 ring-offset-card",
          )}
        >
          <ScanLine className="size-4 shrink-0" aria-hidden="true" strokeWidth={2.25} />
          <span>Escanear cupom</span>
        </Link>

        <nav aria-label="Navegação principal" className="mt-6 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = item.match(currentPath)
            const Icon = item.icon

            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest",
                  active
                    ? "bg-sand font-bold text-forest"
                    : "font-medium text-ink-muted hover:bg-canvas hover:text-ink",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-5 w-1 shrink-0 rounded-full transition-colors",
                    active ? "bg-forest" : "bg-transparent",
                  )}
                />
                <Icon
                  className="size-4 shrink-0"
                  strokeWidth={active ? 2.25 : 1.75}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-3 border-t border-border/70 pt-4">
        {canTogglePhonePreview && (
          <DevicePreviewToggle active={false} onToggle={togglePhonePreview} variant="sidebar" />
        )}
        <div className="text-xs leading-relaxed text-ink-muted">
          <p className="font-semibold text-ink">Capim Dourado Shopping</p>
          <p>Palmas-TO · Programa Raiz</p>
        </div>
      </div>
    </aside>
  )
}
