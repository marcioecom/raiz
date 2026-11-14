import type { Redemption } from "../voucher"

import { useNavigate } from "@tanstack/react-router"
import { useEffect, useRef, useState, useSyncExternalStore } from "react"

import { getRemainingSeconds, isVoucherExpired, isVoucherStale } from "../voucher"
import { voucherStore } from "../voucher-store"

export interface CopyCodeFeedback {
  tone: "success" | "error"
  text: string
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fallback abaixo para contextos sem permissão de Clipboard API.
    }
  }
  if (typeof document === "undefined" || !document.body) return false
  const field = Object.assign(document.createElement("textarea"), { value: text })
  field.setAttribute("readonly", "")
  field.style.cssText = "position:fixed;inset-block-start:0;opacity:0"
  document.body.append(field)
  field.select()
  try {
    return document.execCommand("copy")
  } catch {
    return false
  } finally {
    field.remove()
  }
}

/** Observa o voucher real em memória/sessionStorage com relógio sincronizado de 1 segundo. */
export function useActiveVoucher() {
  const stored: Redemption | null = useSyncExternalStore(
    voucherStore.subscribe,
    voucherStore.getSnapshot,
    voucherStore.getSnapshot,
  )
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (!stored) return
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [stored])

  useEffect(() => {
    if (stored?.expires_at && isVoucherStale(stored.expires_at, nowMs)) voucherStore.clear()
  }, [stored, nowMs])

  const stale = stored?.expires_at ? isVoucherStale(stored.expires_at, nowMs) : false
  const voucher = stale ? null : stored
  const expiresAt = voucher?.expires_at ?? ""
  return {
    voucher,
    remainingSeconds: voucher ? getRemainingSeconds(expiresAt, nowMs) : 0,
    expired: voucher ? isVoucherExpired(expiresAt, nowMs) : true,
  }
}

/** Orquestra a tela 6B (voucher ativo de balcão, cópia com região live e conclusão). */
export function useVoucherDetail(rewardId: string) {
  const navigate = useNavigate()
  const { voucher, remainingSeconds, expired } = useActiveVoucher()
  const [copyFeedback, setCopyFeedback] = useState<CopyCodeFeedback | null>(null)
  const copyTimerRef = useRef<number | null>(null)
  const lastAnnouncementRef = useRef("")

  useEffect(
    () => () => {
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current)
    },
    [],
  )

  const redemption = voucher && voucher.reward?.id === rewardId ? voucher : null

  const announceCopy = (tone: CopyCodeFeedback["tone"], rawText: string) => {
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current)
    const text = lastAnnouncementRef.current === rawText ? `${rawText}\u00A0` : rawText
    lastAnnouncementRef.current = text
    setCopyFeedback({ tone, text })
    copyTimerRef.current = window.setTimeout(() => setCopyFeedback(null), 2500)
  }

  const copyCode = async () => {
    const code = redemption?.code?.trim()
    if (!code) return
    if (await copyTextToClipboard(code)) announceCopy("success", "Código copiado.")
    else announceCopy("error", "Não foi possível copiar o código. Informe os caracteres no balcão.")
  }

  return {
    redemption,
    remainingSeconds,
    expired,
    copyFeedback,
    copyCode: () => void copyCode(),
    closeToCatalog: () => {
      if (redemption && expired) voucherStore.clear()
      void navigate({ to: "/premios" })
    },
    markAsUsed: () => {
      voucherStore.clear()
      void navigate({ to: "/premios" })
    },
  }
}
