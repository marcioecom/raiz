import type { QueryClient } from "@tanstack/react-query"
import type { AnyRouter } from "@tanstack/react-router"

import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  PHONE_FRAME_NAME,
  PHONE_PREVIEW_STORAGE_KEY,
  PHONE_ROUTE_MESSAGE_TYPE,
} from "./device-preview"
import { DevicePreviewProvider } from "./device-preview-context"
import { DevicePreviewToggle } from "./device-preview-toggle"
import { useDevicePreview } from "./use-device-preview"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

interface MockMediaQueryController {
  setDesktop: (matches: boolean) => void
}

function installMatchMediaMock(initialMatches: boolean): MockMediaQueryController {
  let matches = initialMatches
  const listeners = new Set<(event: MediaQueryListEvent) => void>()

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn(() => ({
      get matches() {
        return matches
      },
      media: "(min-width: 1024px)",
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.add(listener)
      },
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.delete(listener)
      },
    })),
  })

  return {
    setDesktop(nextMatches: boolean) {
      matches = nextMatches
      const event = { matches: nextMatches } as MediaQueryListEvent
      for (const listener of listeners) {
        listener(event)
      }
    },
  }
}

function DesktopProbe() {
  const { canTogglePhonePreview, togglePhonePreview } = useDevicePreview()

  return (
    <div>
      <p data-testid="desktop-probe">Desktop ativo</p>
      {canTogglePhonePreview && (
        <DevicePreviewToggle active={false} onToggle={togglePhonePreview} variant="sidebar" />
      )}
    </div>
  )
}

function mountHarness(initialMatches = true) {
  const media = installMatchMediaMock(initialMatches)
  const queryClient = {
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn(),
  } as unknown as QueryClient
  const historyReplace = vi.fn()
  const router = {
    history: {
      location: { href: "/" },
      replace: historyReplace,
    },
    load: vi.fn().mockResolvedValue(undefined),
  } as unknown as AnyRouter

  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() => {
    root.render(
      <DevicePreviewProvider queryClient={queryClient} router={router}>
        <DesktopProbe />
      </DevicePreviewProvider>,
    )
  })

  return {
    container,
    media,
    queryClient,
    router,
    historyReplace,
    unmount() {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

describe("DevicePreviewProvider", () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    window.localStorage.clear()
    window.history.replaceState(null, "", "/")
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ""
    window.sessionStorage.clear()
    window.localStorage.clear()
  })

  it("toggles mobile simulator frame on desktop, syncs iframe route, and restores desktop", () => {
    const harness = mountHarness(true)

    const enableButton = harness.container.querySelector("button")
    expect(enableButton?.textContent).toContain("Simular celular")
    expect(enableButton?.getAttribute("aria-pressed")).toBe("false")
    expect(harness.container.querySelector("[data-testid='desktop-probe']")).not.toBeNull()

    act(() => {
      enableButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    expect(window.sessionStorage.getItem(PHONE_PREVIEW_STORAGE_KEY)).toBe("mobile")
    expect(harness.container.querySelector("[data-testid='desktop-probe']")).toBeNull()

    const iframe = harness.container.querySelector("iframe")
    expect(iframe).not.toBeNull()
    expect(iframe?.getAttribute("name")).toBe(PHONE_FRAME_NAME)
    expect(iframe?.getAttribute("title")).toBe("Visualização simulada do Raiz em formato celular")
    expect(iframe?.getAttribute("src")).toBe("/")

    const disableButton = harness.container.querySelector("button")
    expect(disableButton?.textContent).toContain("Desativar modo celular")
    expect(disableButton?.getAttribute("aria-pressed")).toBe("true")

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          source: iframe?.contentWindow ?? null,
          data: { type: PHONE_ROUTE_MESSAGE_TYPE, href: "/carteira" },
        }),
      )
    })

    expect(window.location.pathname).toBe("/carteira")

    act(() => {
      disableButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    expect(window.sessionStorage.getItem(PHONE_PREVIEW_STORAGE_KEY)).toBeNull()
    expect(harness.container.querySelector("iframe")).toBeNull()
    expect(harness.container.querySelector("[data-testid='desktop-probe']")).not.toBeNull()
    expect(harness.historyReplace).toHaveBeenCalledWith("/carteira", undefined, {
      ignoreBlocker: true,
    })
    expect(harness.router.load).toHaveBeenCalled()
    expect(harness.queryClient.invalidateQueries).toHaveBeenCalled()

    harness.unmount()
  })

  it("hides toggle below desktop breakpoint and exits simulator automatically on narrow resize", () => {
    const narrowHarness = mountHarness(false)
    expect(narrowHarness.container.querySelector("button")).toBeNull()
    expect(narrowHarness.container.querySelector("iframe")).toBeNull()
    narrowHarness.unmount()

    const desktopHarness = mountHarness(true)
    const enableButton = desktopHarness.container.querySelector("button")
    act(() => {
      enableButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
    expect(desktopHarness.container.querySelector("iframe")).not.toBeNull()

    act(() => {
      desktopHarness.media.setDesktop(false)
    })

    expect(desktopHarness.container.querySelector("iframe")).toBeNull()
    expect(desktopHarness.container.querySelector("button")).toBeNull()
    desktopHarness.unmount()
  })
})
