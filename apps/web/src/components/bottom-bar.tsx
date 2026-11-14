import type { LucideIcon } from "lucide-react"

import { Link } from "@tanstack/react-router"
import { Home, ListChecks, ScanLine, User, Wallet } from "lucide-react"

import { cn } from "@/lib/utils"

export interface BottomBarProps {
  currentPath: string
  hidden?: boolean
}

interface NavItem {
  to: "/" | "/missoes" | "/carteira" | "/perfil"
  label: string
  icon: LucideIcon
  isActive: (path: string) => boolean
}

const LEFT_ITEMS: NavItem[] = [
  {
    to: "/",
    label: "Início",
    icon: Home,
    isActive: (path) => path === "/",
  },
  {
    to: "/missoes",
    label: "Missões",
    icon: ListChecks,
    isActive: (path) => path.startsWith("/missoes"),
  },
]

const RIGHT_ITEMS: NavItem[] = [
  {
    to: "/carteira",
    label: "Carteira",
    icon: Wallet,
    isActive: (path) => path.startsWith("/carteira"),
  },
  {
    to: "/perfil",
    label: "Perfil",
    icon: User,
    isActive: (path) => path.startsWith("/perfil"),
  },
]

function NavLinkItem({ item, currentPath }: { item: NavItem; currentPath: string }) {
  const Icon = item.icon
  const active = item.isActive(currentPath)

  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-14 min-w-11 flex-col items-center justify-center gap-1 rounded-xl px-1 pb-1.5 pt-1 text-xs leading-4 transition-colors duration-150",
        active ? "font-bold text-forest" : "font-medium text-ink-muted hover:text-ink",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("h-0.5 w-6 rounded-full", active ? "bg-forest" : "bg-transparent")}
      />
      <Icon aria-hidden="true" className="h-5 w-5 shrink-0" strokeWidth={1.75} />
      <span>{item.label}</span>
    </Link>
  )
}

export function BottomBar({ currentPath, hidden = false }: BottomBarProps) {
  if (hidden) {
    return null
  }

  const scanActive = currentPath.startsWith("/scan")

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[448px] border-t border-border bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(22,36,29,0.08)]"
    >
      <div className="grid h-16 grid-cols-5 items-end px-1">
        {LEFT_ITEMS.map((item) => (
          <NavLinkItem key={item.to} item={item} currentPath={currentPath} />
        ))}

        <div className="flex flex-col items-center justify-end pb-1.5">
          <Link
            to="/scan"
            aria-current={scanActive ? "page" : undefined}
            className="flex min-w-14 flex-col items-center gap-1 rounded-xl px-1"
          >
            <span className="-mt-5 inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-gold bg-forest text-on-forest shadow-[0_4px_16px_rgba(22,36,29,0.16)]">
              <ScanLine aria-hidden="true" className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <span className="text-[11px] font-semibold leading-none text-forest">Escanear</span>
          </Link>
        </div>

        {RIGHT_ITEMS.map((item) => (
          <NavLinkItem key={item.to} item={item} currentPath={currentPath} />
        ))}
      </div>
    </nav>
  )
}
