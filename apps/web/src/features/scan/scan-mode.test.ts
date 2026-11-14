import { afterEach, describe, expect, it, vi } from "vitest"

import { getInitialScanMode } from "./scan-mode"

const originalMatchMediaDescriptor =
  typeof window !== "undefined" ? Object.getOwnPropertyDescriptor(window, "matchMedia") : undefined

function createMatchMediaList(matches: boolean, media: string): MediaQueryList {
  return {
    matches,
    media,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }
}

describe("getInitialScanMode", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()

    if (typeof window !== "undefined") {
      if (originalMatchMediaDescriptor) {
        Object.defineProperty(window, "matchMedia", originalMatchMediaDescriptor)
      } else {
        delete (window as { matchMedia?: unknown }).matchMedia
      }
    }
  })

  it('retorna "manual" em desktop (min-width: 1024px e pointer: fine)', () => {
    const matchMediaMock = vi.fn((query: string) =>
      createMatchMediaList(query === "(min-width: 1024px) and (pointer: fine)", query),
    )
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: matchMediaMock,
    })

    expect(getInitialScanMode()).toBe("manual")
    expect(matchMediaMock).toHaveBeenCalledWith("(min-width: 1024px) and (pointer: fine)")
  })

  it('retorna "camera" em mobile ou ponteiro impreciso (matches = false)', () => {
    const matchMediaMock = vi.fn((query: string) => createMatchMediaList(false, query))
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: matchMediaMock,
    })

    expect(getInitialScanMode()).toBe("camera")
    expect(matchMediaMock).toHaveBeenCalledWith("(min-width: 1024px) and (pointer: fine)")
  })

  it('retorna "camera" quando matchMedia não está disponível', () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: undefined,
    })

    expect(getInitialScanMode()).toBe("camera")
  })

  it('retorna "camera" quando window não está definido', () => {
    vi.stubGlobal("window", undefined)

    expect(getInitialScanMode()).toBe("camera")
  })
})
