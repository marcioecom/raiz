import type { ReactNode } from "react"

import { BottomBar } from "@/components/bottom-bar"
import { DesktopSidebar } from "@/components/desktop-sidebar"
import { cn } from "@/lib/utils"

export interface AppShellProps {
  children: ReactNode
  currentPath: string
  showBottomBar?: boolean
}

export function AppShell({ children, currentPath, showBottomBar = true }: AppShellProps) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[448px] flex-col bg-canvas min-[449px]:border-x min-[449px]:border-border lg:max-w-[1440px] lg:flex-row lg:border-x-0 min-[1441px]:border-x">
      <a href="#main-content" className="skip-link visually-hidden focus-on-forest">
        Pular para o conteúdo
      </a>
      <DesktopSidebar currentPath={currentPath} />
      <main
        id="main-content"
        tabIndex={-1}
        className={cn(
          "min-w-0 flex-1 px-4 pt-[max(1rem,env(safe-area-inset-top))] outline-none lg:px-8 lg:pt-8 lg:pb-8",
          showBottomBar
            ? "pb-[calc(6rem+env(safe-area-inset-bottom))]"
            : "pb-[max(1.5rem,env(safe-area-inset-bottom))]",
        )}
      >
        <div className="lg:mx-auto lg:w-full lg:max-w-[1120px]">{children}</div>
      </main>
      <BottomBar currentPath={currentPath} hidden={!showBottomBar} />
    </div>
  )
}
