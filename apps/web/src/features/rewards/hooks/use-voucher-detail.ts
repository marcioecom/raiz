import type { CopyCodeFeedback, RedemptionStatus } from "../types"

import { useNavigate } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"

import { copyTextToClipboard } from "@/lib/clipboard"

import {
  getRemainingSeconds,
  mergeServerAndStoredRedemptions,
  resolveVoucherStatus,
  selectVoucherForReward,
} from "../voucher"
import { voucherStore } from "../voucher-store"
import { useActiveVoucher } from "./use-active-voucher"
import { useMyRedemptions } from "./use-rewards"

/** Orquestra a tela 6B: reidratação pelo servidor, polling de 5s enquanto pendente e cópia acessível. */
export function useVoucherDetail(rewardId: string) {
  const navigate = useNavigate()
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  )
  const redemptionsQuery = useMyRedemptions(
    // Faz polling a cada 5s enquanto o voucher estiver pendente e /v1/me/redemptions existir.
    (result) => {
      if (result && !result.supported) {
        return false
      }
      const merged = mergeServerAndStoredRedemptions(
        result?.items ?? [],
        voucherStore.getForReward(rewardId),
      )
      const target = selectVoucherForReward(merged, rewardId)
      if (!target) {
        return false
      }
      return resolveVoucherStatus(target) === "pending" ? 5000 : false
    },
  )

  const serverItems = redemptionsQuery.data?.items ?? []
  const hasServerPending = serverItems.some(
    (item) => item.reward?.id === rewardId && resolveVoucherStatus(item) === "pending",
  )
  const { voucher: storedVoucher, nowMs } = useActiveVoucher(hasServerPending)
  const mergedRedemptions = mergeServerAndStoredRedemptions(serverItems, storedVoucher)
  const redemption = selectVoucherForReward(mergedRedemptions, rewardId, nowMs)
  const status: RedemptionStatus | null = redemption
    ? resolveVoucherStatus(redemption, nowMs)
    : null
  const remainingSeconds =
    redemption?.expires_at && status === "pending"
      ? getRemainingSeconds(redemption.expires_at, nowMs)
      : 0

  const [copyFeedback, setCopyFeedback] = useState<CopyCodeFeedback | null>(null)
  const copyTimerRef = useRef<number | null>(null)
  const lastAnnouncementRef = useRef("")

  useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    return () => {
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current)
    }
  }, [])

  const announceCopy = (tone: CopyCodeFeedback["tone"], rawText: string) => {
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current)
    const text = lastAnnouncementRef.current === rawText ? `${rawText}\u00A0` : rawText
    lastAnnouncementRef.current = rawText
    setCopyFeedback({ tone, text })
    copyTimerRef.current = window.setTimeout(() => setCopyFeedback(null), 2500)
  }

  const copyCode = async () => {
    const code = redemption?.code?.trim()
    if (!code) return
    if (await copyTextToClipboard(code)) {
      announceCopy("success", "Código copiado.")
      return
    }
    announceCopy("error", "Não foi possível copiar o código. Informe os caracteres no balcão.")
  }

  const clearLocalIfMatching = () => {
    const current = voucherStore.getSnapshot()
    if (!current || !redemption) return
    const matchesById = Boolean(current.id && redemption.id && current.id === redemption.id)
    const matchesByCode = Boolean(
      current.code && redemption.code && current.code === redemption.code,
    )
    if (matchesById || matchesByCode || current.reward?.id === rewardId) {
      voucherStore.clear()
    }
  }

  return {
    redemption,
    status,
    remainingSeconds,
    expired: status === "expired",
    isInitialLoading: !redemption && redemptionsQuery.isPending,
    isLoadError: !redemption && redemptionsQuery.isError,
    loadError: redemptionsQuery.error,
    redemptionsSupported: redemptionsQuery.data?.supported ?? true,
    isOnline,
    copyFeedback,
    copyCode: () => void copyCode(),
    retryLoad: () => void redemptionsQuery.refetch(),
    closeToCatalog: () => {
      if (status === "expired" || status === "used") {
        clearLocalIfMatching()
      }
      void navigate({ to: "/premios" })
    },
    markAsUsed: () => {
      clearLocalIfMatching()
      void navigate({ to: "/premios" })
    },
  }
}
