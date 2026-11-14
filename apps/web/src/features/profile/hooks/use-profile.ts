import type { ServiceMeta } from "../api"
import type { ExtendedMe } from "../types"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"

import { clearToken } from "@/api/token"
import { voucherStore } from "@/features/rewards/voucher-store"
import { clearReceiptQueue } from "@/features/scan/queue"
import { copyTextToClipboard } from "@/lib/clipboard"
import { normalizeReferralCode } from "@/lib/referral"

import {
  deleteMyAccount,
  fetchAllLedgerEntries,
  fetchAllReceipts,
  fetchMe,
  fetchMeta,
  fetchMyRedemptions,
} from "../api"
import { buildClubInviteUrl, buildLgpdExportPayload } from "../tier"

export interface ShareFeedback {
  tone: "success" | "error"
  text: string
}

export const profileKeys = {
  all: () => ["profile"] as const,
  me: () => [...profileKeys.all(), "me"] as const,
  meta: () => [...profileKeys.all(), "meta"] as const,
}

function resolveOrigin(): string {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin
  }
  return ""
}

function triggerJsonDownload(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Orquestra queries de perfil/meta, compartilhamento, exportação LGPD e exclusão de conta. */
export function useProfile() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [shareFeedback, setShareFeedback] = useState<ShareFeedback | null>(null)
  const [exportFeedback, setExportFeedback] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const feedbackTimerRef = useRef<number | null>(null)
  const lastAnnouncementRef = useRef("")

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current)
    }
  }, [])

  const meQuery = useQuery<ExtendedMe>({ queryKey: profileKeys.me(), queryFn: fetchMe })
  const metaQuery = useQuery<ServiceMeta>({
    queryKey: profileKeys.meta(),
    queryFn: fetchMeta,
    staleTime: 5 * 60_000,
  })
  const referralCode = normalizeReferralCode(meQuery.data?.referral_code)
  const clubUrl = buildClubInviteUrl(resolveOrigin(), referralCode)

  const announceShare = (tone: ShareFeedback["tone"], rawText: string) => {
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current)
    const text = lastAnnouncementRef.current === rawText ? `${rawText}\u00A0` : rawText
    lastAnnouncementRef.current = rawText
    setShareFeedback({ tone, text })
    feedbackTimerRef.current = window.setTimeout(() => setShareFeedback(null), 3500)
  }

  const copyClubLink = async () => {
    if (await copyTextToClipboard(clubUrl)) {
      announceShare("success", "Link do clube copiado.")
      return
    }
    announceShare("error", "Não foi possível copiar o link. Copie o endereço exibido acima.")
  }

  const shareClubLink = async () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Raiz — Capim Dourado Shopping",
          text: "Conheça o Raiz, clube de benefícios do Capim Dourado Shopping.",
          url: clubUrl,
        })
        announceShare("success", "Link do clube compartilhado.")
        return
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return
      }
    }
    await copyClubLink()
  }

  const exportMutation = useMutation({
    mutationFn: async () => {
      const [me, ledger, receipts, redemptions] = await Promise.all([
        fetchMe(),
        fetchAllLedgerEntries(),
        fetchAllReceipts(),
        fetchMyRedemptions(),
      ])
      const payload = buildLgpdExportPayload({
        me,
        entries: ledger.entries,
        truncated: ledger.truncated,
        receipts,
        redemptions,
      })
      triggerJsonDownload("raiz-dados-lgpd.json", payload)
      return {
        totalEntries: ledger.entries.length,
        truncated: ledger.truncated,
        totalReceipts: receipts.items.length,
        receiptsSupported: receipts.supported,
        receiptsTruncated: receipts.truncated,
        totalRedemptions: redemptions.items.length,
        redemptionsSupported: redemptions.supported,
      }
    },
    onMutate: () => setExportFeedback(null),
    onSuccess: (summary) => {
      const entriesLabel = summary.truncated
        ? `${summary.totalEntries} lançamentos mais recentes`
        : `${summary.totalEntries} lançamentos`
      const parts = [entriesLabel]
      if (summary.receiptsSupported) {
        parts.push(
          summary.receiptsTruncated
            ? `${summary.totalReceipts} cupons mais recentes`
            : `${summary.totalReceipts} cupons`,
        )
      }
      if (summary.redemptionsSupported) {
        parts.push(`${summary.totalRedemptions} resgates`)
      }
      setExportFeedback(`Arquivo raiz-dados-lgpd.json baixado (${parts.join(", ")}).`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMyAccount,
    onSuccess: async () => {
      clearToken()
      voucherStore.clear()
      clearReceiptQueue()
      setIsDeleteDialogOpen(false)
      await navigate({ to: "/entrar", replace: true })
      queryClient.clear()
    },
  })

  const setDeleteDialogOpen = (open: boolean) => {
    if (!open && deleteMutation.isPending) return
    if (!open) deleteMutation.reset()
    setIsDeleteDialogOpen(open)
  }

  return {
    meQuery,
    isDemoMode: metaQuery.data?.demo_mode === true,
    referralCode,
    clubUrl,
    shareFeedback,
    copyClubLink: () => void copyClubLink(),
    shareClubLink: () => void shareClubLink(),
    isExporting: exportMutation.isPending,
    exportError: exportMutation.error,
    exportFeedback,
    exportMyData: () => exportMutation.mutate(),
    isDeleteDialogOpen,
    setDeleteDialogOpen,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,
    confirmDeleteAccount: () => deleteMutation.mutate(),
  }
}
