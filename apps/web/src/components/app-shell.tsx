import type { ReactNode } from "react"

import { BottomBar } from "@/components/bottom-bar"
import { cn } from "@/lib/utils"

export interface AppShellProps {
  children: ReactNode
  currentPath: string
  showBottomBar?: boolean
}

export function AppShell({ children, currentPath, showBottomBar = true }: AppShellProps) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[448px] flex-col bg-canvas min-[449px]:border-x min-[449px]:border-border">
      <main
        className={cn(
          "flex-1 px-4 pt-[max(1rem,env(safe-area-inset-top))]",
          showBottomBar
            ? "pb-[calc(6rem+env(safe-area-inset-bottom))]"
            : "pb-[max(1.5rem,env(safe-area-inset-bottom))]",
        )}
      >
        {children}
      </main>
      <BottomBar currentPath={currentPath} hidden={!showBottomBar} />
    </div>
  )
}
