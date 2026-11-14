import { describe, expect, it } from "vitest"

import {
  getCurrentWindowHref,
  isInsidePhoneFrame,
  isSafeInternalHref,
  parsePhoneRouteMessage,
  PHONE_FRAME_NAME,
  PHONE_PREVIEW_STORAGE_KEY,
  PHONE_ROUTE_MESSAGE_TYPE,
  readDevicePreviewPreference,
  writeDevicePreviewPreference,
} from "./device-preview"

function createMemoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear() {
      map.clear()
    },
    getItem(key) {
      return map.get(key) ?? null
    },
    key(index) {
      return Array.from(map.keys())[index] ?? null
    },
    removeItem(key) {
      map.delete(key)
    },
    setItem(key, value) {
      map.set(key, value)
    },
  }
}

describe("device-preview", () => {
  it("detects when running inside the named phone simulator iframe only", () => {
    const topWindow = { id: "top" }
    expect(isInsidePhoneFrame({ self: topWindow, top: topWindow, name: PHONE_FRAME_NAME })).toBe(
      false,
    )

    const iframeWindow = { id: "frame" }
    expect(isInsidePhoneFrame({ self: iframeWindow, top: topWindow, name: "other-frame" })).toBe(
      false,
    )
    expect(isInsidePhoneFrame({ self: iframeWindow, top: topWindow, name: PHONE_FRAME_NAME })).toBe(
      true,
    )
  })

  it("reads and writes session preference safely", () => {
    const storage = createMemoryStorage()
    expect(readDevicePreviewPreference(storage)).toBe(false)

    writeDevicePreviewPreference(true, storage)
    expect(storage.getItem(PHONE_PREVIEW_STORAGE_KEY)).toBe("mobile")
    expect(readDevicePreviewPreference(storage)).toBe(true)

    writeDevicePreviewPreference(false, storage)
    expect(storage.getItem(PHONE_PREVIEW_STORAGE_KEY)).toBeNull()
    expect(readDevicePreviewPreference(storage)).toBe(false)
  })

  it("handles failing storage without throwing", () => {
    const brokenStorage = {
      getItem() {
        throw new Error("denied")
      },
      setItem() {
        throw new Error("quota")
      },
      removeItem() {
        throw new Error("denied")
      },
    } as unknown as Storage

    expect(readDevicePreviewPreference(brokenStorage)).toBe(false)
    expect(() => writeDevicePreviewPreference(true, brokenStorage)).not.toThrow()
    expect(() => writeDevicePreviewPreference(false, brokenStorage)).not.toThrow()
  })

  it("accepts only safe root-relative internal hrefs", () => {
    expect(isSafeInternalHref("/")).toBe(true)
    expect(isSafeInternalHref("/carteira")).toBe(true)
    expect(isSafeInternalHref("/entrar?passo=codigo#topo")).toBe(true)

    expect(isSafeInternalHref("")).toBe(false)
    expect(isSafeInternalHref("//evil.example/path")).toBe(false)
    expect(isSafeInternalHref("/\\evil.example")).toBe(false)
    expect(isSafeInternalHref("https://evil.example")).toBe(false)
    expect(isSafeInternalHref("javascript:alert(1)")).toBe(false)
    expect(isSafeInternalHref("/carteira\nLocation: evil")).toBe(false)
  })

  it("validates postMessage origin and route payload strictly", () => {
    const origin = "https://raiz.marcio.run"
    expect(
      parsePhoneRouteMessage({ type: PHONE_ROUTE_MESSAGE_TYPE, href: "/missoes" }, origin, origin),
    ).toBe("/missoes")

    expect(
      parsePhoneRouteMessage(
        { type: PHONE_ROUTE_MESSAGE_TYPE, href: "/missoes" },
        "https://attacker.example",
        origin,
      ),
    ).toBeNull()

    expect(
      parsePhoneRouteMessage({ type: "other:event", href: "/missoes" }, origin, origin),
    ).toBeNull()

    expect(
      parsePhoneRouteMessage(
        { type: PHONE_ROUTE_MESSAGE_TYPE, href: "//attacker.example" },
        origin,
        origin,
      ),
    ).toBeNull()
  })

  it("builds current window href safely", () => {
    expect(
      getCurrentWindowHref({
        location: { pathname: "/premios/123", search: "?tab=1", hash: "" },
      }),
    ).toBe("/premios/123?tab=1")
    expect(getCurrentWindowHref(undefined)).toBe("/")
  })
})
