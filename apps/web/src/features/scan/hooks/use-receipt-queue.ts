import type { ReceiptResult } from "../api"
import type { QueuedReceipt, ScanSource } from "../queue"

import { useCallback, useEffect, useRef, useState } from "react"

import { ApiError } from "@/api/client"
import { messageFor } from "@/api/messages"

import { submitReceipt } from "../api"
import {
  enqueueReceipt,
  listQueuedReceipts,
  recordReceiptAttemptFailure,
  removeQueuedReceipt,
} from "../queue"

export interface QueueNotice {
  tone: "success" | "error"
  text: string
}

export interface UseReceiptQueueOptions {
  onSynced: (lastSynced: ReceiptResult | null, showSuccessCard: boolean) => Promise<void>
}

export const isNetworkFailure = (err: unknown): boolean =>
  err instanceof TypeError ||
  (err instanceof ApiError && (err.status === 0 || err.code === "network_error"))

const shouldKeepInQueue = (err: unknown): boolean =>
  isNetworkFailure(err) ||
  (err instanceof ApiError &&
    (err.status >= 500 || err.status === 401 || err.status === 429 || err.code === "rate_limited"))

/** Gerencia a fila offline de cupons, listeners online/offline e sincronização idempotente. */
export function useReceiptQueue({ onSynced }: UseReceiptQueueOptions) {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  )
  const [queuedItems, setQueuedItems] = useState<QueuedReceipt[]>(() => listQueuedReceipts())
  const [isFlushingQueue, setIsFlushingQueue] = useState(false)
  const [queueNotice, setQueueNotice] = useState<QueueNotice | null>(null)

  const flushingRef = useRef(false)
  const onSyncedRef = useRef(onSynced)

  useEffect(() => {
    onSyncedRef.current = onSynced
  }, [onSynced])

  const enqueue = useCallback(
    (input: { accessKey: string; source: ScanSource; idempotencyKey: string }) => {
      setQueuedItems(enqueueReceipt(input).items)
      setQueueNotice({ tone: "success", text: "Cupom guardado na fila deste aparelho." })
    },
    [],
  )

  const clearNotice = useCallback(() => {
    setQueueNotice(null)
  }, [])

  const runFlush = useCallback(async (showSuccessCard: boolean) => {
    if (flushingRef.current || (typeof navigator !== "undefined" && !navigator.onLine)) return
    const snapshot = listQueuedReceipts()
    if (snapshot.length === 0) return
    flushingRef.current = true
    setIsFlushingQueue(true)
    setQueueNotice(null)
    let synced = 0
    let lastSynced: ReceiptResult | null = null
    try {
      for (const item of snapshot) {
        if (typeof navigator !== "undefined" && !navigator.onLine) break
        try {
          lastSynced = await submitReceipt({
            accessKey: item.accessKey,
            source: item.source,
            idempotencyKey: item.idempotencyKey,
          })
          setQueuedItems(removeQueuedReceipt(item.id))
          synced++
        } catch (error) {
          if (shouldKeepInQueue(error)) {
            const code = error instanceof ApiError ? error.code : "network_error"
            setQueuedItems(recordReceiptAttemptFailure(item.id, code))
            setQueueNotice({ tone: "error", text: messageFor(error) })
            break
          }
          setQueuedItems(removeQueuedReceipt(item.id))
          setQueueNotice({ tone: "error", text: messageFor(error) })
        }
      }
      if (synced > 0) {
        await onSyncedRef.current(lastSynced, showSuccessCard)
        setQueueNotice({
          tone: "success",
          text:
            synced === 1
              ? "1 cupom da fila foi sincronizado."
              : `${synced} cupons da fila foram sincronizados.`,
        })
      }
    } finally {
      flushingRef.current = false
      setIsFlushingQueue(false)
    }
  }, [])

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true)
      void runFlush(false)
    }
    const onOffline = () => setIsOnline(false)
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    const timer = window.setTimeout(() => {
      if (typeof navigator === "undefined" || navigator.onLine) void runFlush(false)
    }, 0)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
    }
  }, [runFlush])

  return {
    isOnline,
    queuedCount: queuedItems.length,
    isFlushingQueue,
    queueNotice,
    enqueue,
    clearNotice,
    flushQueue: () => void runFlush(true),
  }
}
