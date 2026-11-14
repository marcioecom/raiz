import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { RaizLogo } from "./raiz-logo"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let originalShowModal: (() => void) | undefined
let originalClose: (() => void) | undefined

function mountLogo(props: Parameters<typeof RaizLogo>[0] = {}) {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(<RaizLogo {...props} />)
  })
  return {
    container,
    unmount() {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

function clickTimes(element: Element, times: number) {
  for (let index = 0; index < times; index += 1) {
    act(() => {
      element.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
  }
}

describe("RaizLogo", () => {
  beforeEach(() => {
    originalShowModal = HTMLDialogElement.prototype.showModal
    originalClose = HTMLDialogElement.prototype.close

    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "")
    }
    HTMLDialogElement.prototype.close = function close() {
      if (!this.hasAttribute("open")) return
      this.removeAttribute("open")
      this.dispatchEvent(new Event("close"))
    }
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ""
    HTMLDialogElement.prototype.showModal = originalShowModal as () => void
    HTMLDialogElement.prototype.close = originalClose as () => void
  })

  it("grows roots across 12 clicks and opens the Jason modal on click 13 for 3 seconds", () => {
    vi.useFakeTimers()
    const mounted = mountLogo()
    const button = mounted.container.querySelector("button")
    const dialog = mounted.container.querySelector("dialog")

    expect(button).not.toBeNull()
    expect(dialog).not.toBeNull()
    expect(button?.getAttribute("data-growth")).toBe("0")
    expect(button?.getAttribute("data-easter-egg")).toBe("false")
    expect(dialog?.hasAttribute("open")).toBe(false)

    clickTimes(button!, 4)
    expect(button?.getAttribute("data-growth")).toBe("1")
    expect(dialog?.hasAttribute("open")).toBe(false)

    clickTimes(button!, 4)
    expect(button?.getAttribute("data-growth")).toBe("2")
    expect(dialog?.hasAttribute("open")).toBe(false)

    clickTimes(button!, 4)
    expect(button?.getAttribute("data-growth")).toBe("3")
    expect(dialog?.hasAttribute("open")).toBe(false)

    clickTimes(button!, 1)
    expect(button?.getAttribute("data-growth")).toBe("4")
    expect(button?.getAttribute("data-easter-egg")).toBe("true")
    expect(dialog?.hasAttribute("open")).toBe(true)
    expect(dialog?.getAttribute("closedby")).toBe("any")
    expect(dialog?.textContent).toContain("Sexta-feira 13 no Capim.")

    act(() => {
      vi.advanceTimersByTime(2999)
    })
    expect(dialog?.hasAttribute("open")).toBe(true)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(dialog?.hasAttribute("open")).toBe(false)
    expect(button?.getAttribute("data-growth")).toBe("0")
    expect(button?.getAttribute("data-easter-egg")).toBe("false")

    mounted.unmount()
  })

  it("closes early via Fechar button and resets click counter", () => {
    vi.useFakeTimers()
    const mounted = mountLogo()
    const button = mounted.container.querySelector("button")
    const dialog = mounted.container.querySelector("dialog")

    clickTimes(button!, 13)
    expect(dialog?.hasAttribute("open")).toBe(true)

    const closeButton = dialog?.querySelector("button")
    expect(closeButton?.textContent).toBe("Fechar")

    act(() => {
      closeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    expect(dialog?.hasAttribute("open")).toBe(false)
    expect(button?.getAttribute("data-growth")).toBe("0")

    mounted.unmount()
  })

  it("supports showWordmark={false} and interactive={false}", () => {
    const iconOnly = mountLogo({ showWordmark: false })
    const iconButton = iconOnly.container.querySelector("button")
    expect(iconButton?.getAttribute("aria-label")).toBe("RAIZ")
    expect(iconOnly.container.textContent).not.toContain("RAIZ")
    iconOnly.unmount()

    const staticLogo = mountLogo({ interactive: false, showWordmark: false })
    expect(staticLogo.container.querySelector("button")).toBeNull()
    expect(staticLogo.container.querySelector("dialog")).toBeNull()
    const staticSpan = staticLogo.container.querySelector("span")
    expect(staticSpan?.getAttribute("role")).toBe("img")
    expect(staticSpan?.getAttribute("aria-label")).toBe("RAIZ")
    staticLogo.unmount()
  })
})
