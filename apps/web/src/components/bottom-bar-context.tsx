import type { ReactNode } from "react"

import { createContext, useCallback, useContext, useEffect, useId, useState } from "react"

interface BottomBarVisibilityContextValue {
  isHiddenByOverlay: boolean
  registerHiddenOverlay: (id: string, hidden: boolean) => void
}

const BottomBarVisibilityContext = createContext<BottomBarVisibilityContextValue>({
  isHiddenByOverlay: false,
  registerHiddenOverlay: () => undefined,
})

export function BottomBarVisibilityProvider({ children }: { children: ReactNode }) {
  const [hiddenOverlayIds, setHiddenOverlayIds] = useState<Record<string, boolean>>({})

  const registerHiddenOverlay = useCallback((id: string, hidden: boolean) => {
    setHiddenOverlayIds((prev) => {
      if (Boolean(prev[id]) === hidden) {
        return prev
      }
      if (!hidden) {
        const next = { ...prev }
        delete next[id]
        return next
      }
      return { ...prev, [id]: true }
    })
  }, [])

  const isHiddenByOverlay = Object.keys(hiddenOverlayIds).length > 0

  return (
    <BottomBarVisibilityContext.Provider value={{ isHiddenByOverlay, registerHiddenOverlay }}>
      {children}
    </BottomBarVisibilityContext.Provider>
  )
}

export function useBottomBarOverlayHidden(): boolean {
  return useContext(BottomBarVisibilityContext).isHiddenByOverlay
}

export function useHideBottomBar(hidden: boolean): void {
  const id = useId()
  const { registerHiddenOverlay } = useContext(BottomBarVisibilityContext)

  useEffect(() => {
    registerHiddenOverlay(id, hidden)
    return () => registerHiddenOverlay(id, false)
  }, [id, hidden, registerHiddenOverlay])
}
