import type { ServerRedemption } from "../types"

import { useEffect, useState, useSyncExternalStore } from "react"

import { getRemainingSeconds, isVoucherExpired, isVoucherStale } from "../voucher"
import { voucherStore } from "../voucher-store"

/** Observa o voucher local com relógio de 1 segundo compartilhado com vouchers ativos do servidor. */
export function useActiveVoucher(hasExternalPending = false) {
  const stored: ServerRedemption | null = useSyncExternalStore(
    voucherStore.subscribe,
    voucherStore.getSnapshot,
    voucherStore.getSnapshot,
  )
  const [nowMs, setNowMs] = useState(() => Date.now())
  const shouldTick = Boolean(stored) || hasExternalPending

  useEffect(() => {
    if (!shouldTick) {
      return
    }
    // Atualiza o relógio local a cada 1s enquanto houver voucher ativo para o cronômetro regressivo.
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [shouldTick])

  useEffect(() => {
    if (stored?.expires_at && isVoucherStale(stored.expires_at, nowMs)) {
      voucherStore.clear()
    }
  }, [stored, nowMs])

  const stale = stored?.expires_at ? isVoucherStale(stored.expires_at, nowMs) : false
  const voucher = stale ? null : stored
  const expiresAt = voucher?.expires_at ?? ""

  return {
    voucher,
    nowMs,
    remainingSeconds: voucher ? getRemainingSeconds(expiresAt, nowMs) : 0,
    expired: voucher ? isVoucherExpired(expiresAt, nowMs) : true,
  }
}
