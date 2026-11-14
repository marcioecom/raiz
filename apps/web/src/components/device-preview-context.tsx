import type { QueryClient } from "@tanstack/react-query"
import type { AnyRouter } from "@tanstack/react-router"
import type { ReactNode } from "react"

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"

import { getToken } from "@/api/token"
import {
  DESKTOP_MEDIA_QUERY,
  getCurrentWindowHref,
  isInsidePhoneFrame,
  readDevicePreviewPreference,
  writeDevicePreviewPreference,
} from "@/components/device-preview"
import { PhoneSimulatorStage } from "@/components/phone-simulator-stage"
import { DevicePreviewContext } from "@/components/use-device-preview"
import { voucherStore } from "@/features/rewards/voucher-store"

function subscribeDesktopViewport(callback: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => undefined
  }
  const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY)
  mediaQuery.addEventListener("change", callback)
  return () => mediaQuery.removeEventListener("change", callback)
}

function getDesktopViewportSnapshot(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false
  }
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches
}

export interface DevicePreviewProviderProps {
  queryClient: QueryClient
  router: AnyRouter
  children: ReactNode
}

export function DevicePreviewProvider({
  queryClient,
  router,
  children,
}: DevicePreviewProviderProps) {
  const isInsideFrame = useMemo(() => isInsidePhoneFrame(), [])
  const isDesktopViewport = useSyncExternalStore(
    subscribeDesktopViewport,
    getDesktopViewportSnapshot,
    () => false,
  )

  const [isPhonePreviewEnabled, setIsPhonePreviewEnabled] = useState(() =>
    isInsideFrame ? false : readDevicePreviewPreference(),
  )
  const [initialIframeSrc, setInitialIframeSrc] = useState(() => getCurrentWindowHref())

  const latestHrefRef = useRef<string>(initialIframeSrc)
  const tokenAtEntryRef = useRef<string | null>(getToken())
  const wasActiveRef = useRef(false)

  const canTogglePhonePreview = isDesktopViewport && !isInsideFrame
  const isPhonePreviewActive = canTogglePhonePreview && isPhonePreviewEnabled

  useEffect(() => {
    if (isPhonePreviewActive) {
      if (!wasActiveRef.current) {
        wasActiveRef.current = true
        tokenAtEntryRef.current = getToken()
        latestHrefRef.current = getCurrentWindowHref()
      }
      return
    }

    if (!wasActiveRef.current) {
      return
    }
    wasActiveRef.current = false

    voucherStore.reload()
    if (getToken() !== tokenAtEntryRef.current) {
      queryClient.clear()
    } else {
      void queryClient.invalidateQueries()
    }

    const targetHref = latestHrefRef.current
    if (targetHref) {
      router.history.replace(targetHref, undefined, { ignoreBlocker: true })
    }
    void router.load()
  }, [isPhonePreviewActive, queryClient, router])

  const setPhonePreviewActive = useCallback(
    (enabled: boolean) => {
      if (isInsideFrame || !isDesktopViewport) {
        return
      }
      if (enabled) {
        const currentHref = getCurrentWindowHref()
        latestHrefRef.current = currentHref
        setInitialIframeSrc(currentHref)
        writeDevicePreviewPreference(true)
        setIsPhonePreviewEnabled(true)
        return
      }

      writeDevicePreviewPreference(false)
      setIsPhonePreviewEnabled(false)
    },
    [isDesktopViewport, isInsideFrame],
  )

  const togglePhonePreview = useCallback(() => {
    setPhonePreviewActive(!isPhonePreviewActive)
  }, [isPhonePreviewActive, setPhonePreviewActive])

  const notifyIframeRoute = useCallback((href: string) => {
    latestHrefRef.current = href
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", href)
    }
  }, [])

  const contextValue = useMemo(
    () => ({
      canTogglePhonePreview,
      isPhonePreviewActive,
      isInsideFrame,
      togglePhonePreview,
      setPhonePreviewActive,
      notifyIframeRoute,
    }),
    [
      canTogglePhonePreview,
      isPhonePreviewActive,
      isInsideFrame,
      togglePhonePreview,
      setPhonePreviewActive,
      notifyIframeRoute,
    ],
  )

  return (
    <DevicePreviewContext.Provider value={contextValue}>
      {isPhonePreviewActive ? (
        <PhoneSimulatorStage
          initialSrc={initialIframeSrc}
          onExit={() => setPhonePreviewActive(false)}
          onRouteSync={notifyIframeRoute}
        />
      ) : (
        children
      )}
    </DevicePreviewContext.Provider>
  )
}
