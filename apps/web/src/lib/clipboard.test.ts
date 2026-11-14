import { afterEach, describe, expect, it, vi } from "vitest"

import { copyTextToClipboard } from "@/lib/clipboard"

describe("copyTextToClipboard", () => {
  const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard")
  const originalExecCommandDescriptor = Object.getOwnPropertyDescriptor(document, "execCommand")

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()

    if (originalClipboardDescriptor) {
      Object.defineProperty(navigator, "clipboard", originalClipboardDescriptor)
    } else {
      Reflect.deleteProperty(navigator, "clipboard")
    }

    if (originalExecCommandDescriptor) {
      Object.defineProperty(document, "execCommand", originalExecCommandDescriptor)
    } else {
      Reflect.deleteProperty(document, "execCommand")
    }

    document.body.innerHTML = ""
  })

  it("usa navigator.clipboard.writeText quando disponível e retorna true", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    })

    await expect(copyTextToClipboard("7F2K9A")).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText).toHaveBeenCalledWith("7F2K9A")
    expect(document.querySelectorAll("textarea")).toHaveLength(0)
  })

  it("faz fallback para textarea + execCommand quando navigator.clipboard.writeText falha", async () => {
    const writeText = vi.fn().mockRejectedValue(new DOMException("Denied", "NotAllowedError"))
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    })

    const execCommand = vi.fn().mockReturnValue(true)
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    })

    await expect(copyTextToClipboard("https://raiz.app/entrar?convite=JU4821")).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(execCommand).toHaveBeenCalledTimes(1)
    expect(execCommand).toHaveBeenCalledWith("copy")
    expect(document.querySelectorAll("textarea")).toHaveLength(0)
  })

  it("retorna false quando navigator.clipboard está ausente e execCommand retorna false ou lança erro", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    })

    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    })
    await expect(copyTextToClipboard("7F2K9A")).resolves.toBe(false)
    expect(document.querySelectorAll("textarea")).toHaveLength(0)

    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn(() => {
        throw new Error("execCommand blocked")
      }),
    })
    await expect(copyTextToClipboard("7F2K9A")).resolves.toBe(false)
    expect(document.querySelectorAll("textarea")).toHaveLength(0)
  })

  it("retorna false com segurança em ambiente sem document ou sem navigator.clipboard", async () => {
    vi.stubGlobal("navigator", undefined)
    vi.stubGlobal("document", undefined)

    await expect(copyTextToClipboard("7F2K9A")).resolves.toBe(false)
  })

  it("retorna false com segurança quando document.body está ausente e clipboard falha", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("unavailable")),
      },
    })
    vi.stubGlobal("document", { body: null })

    await expect(copyTextToClipboard("7F2K9A")).resolves.toBe(false)
  })
})
