import type { ServiceMeta } from "../api"
import type { Me } from "../tier"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"

import { clearToken } from "@/api/token"
import { voucherStore } from "@/features/rewards/voucher-store"
import { clearReceiptQueue } from "@/features/scan/queue"

import { deleteMyAccount, fetchAllLedgerEntries, fetchMe, fetchMeta } from "../api"
import { buildLgpdExportPayload } from "../tier"

export interface ShareFeedback {
  tone: "success" | "error"
  text: string
}

export const profileKeys = {
  all: () => ["profile"] as const,
  me: () => [...profileKeys.all(), "me"] as const,
  meta: () => [...profileKeys.all(), "meta"] as const,
}

function resolveClubUrl(): string {
  if (
    typeof window !== "undefined" &&
    window.location.origin &&
    window.location.origin !== "null"
  ) {
    return `${window.location.origin}/entrar`
  }
  return "/entrar"
}

async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fallback abaixo para contextos sem permissão de Clipboard API.
    }
  }
  if (typeof document === "undefined" || !document.body) {
    return false
  }
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

  const meQuery = useQuery<Me>({ queryKey: profileKeys.me(), queryFn: fetchMe })
  const metaQuery = useQuery<ServiceMeta>({
    queryKey: profileKeys.meta(),
    queryFn: fetchMeta,
    staleTime: 5 * 60_000,
  })
  const clubUrl = resolveClubUrl()

  const announceShare = (tone: ShareFeedback["tone"], rawText: string) => {
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current)
    const text = lastAnnouncementRef.current === rawText ? `${rawText}\u00A0` : rawText
    lastAnnouncementRef.current = rawText
    setShareFeedback({ tone, text })
    feedbackTimerRef.current = window.setTimeout(() => setShareFeedback(null), 3500)
  }

  const copyClubLink = async () => {
    if (await copyText(clubUrl)) {
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
      const [me, ledger] = await Promise.all([fetchMe(), fetchAllLedgerEntries()])
      const payload = buildLgpdExportPayload({
        me,
        entries: ledger.entries,
        truncated: ledger.truncated,
      })
      triggerJsonDownload("raiz-dados-lgpd.json", payload)
      return { totalEntries: ledger.entries.length, truncated: ledger.truncated }
    },
    onMutate: () => setExportFeedback(null),
    onSuccess: ({ totalEntries, truncated }) => {
      const suffix = truncated
        ? ` (${totalEntries} lançamentos mais recentes incluídos).`
        : ` (${totalEntries} lançamentos incluídos).`
      setExportFeedback(`Arquivo raiz-dados-lgpd.json baixado${suffix}`)
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
