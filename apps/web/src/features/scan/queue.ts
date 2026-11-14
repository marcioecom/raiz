import { normalizeAccessKey } from "./access-key"

export const SCAN_QUEUE_STORAGE_KEY = "raiz.scan.queue.v1"

export type ScanSource = "qr" | "manual"

export interface QueuedReceipt {
  id: string
  accessKey: string
  source: ScanSource
  idempotencyKey: string
  createdAt: string
  attempts: number
  lastErrorCode: string | null
}

export interface EnqueueReceiptInput {
  accessKey: string
  source: ScanSource
  idempotencyKey?: string
}

export interface EnqueueReceiptResult {
  item: QueuedReceipt
  items: QueuedReceipt[]
  deduplicated: boolean
}

function getDefaultStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null
  }
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** Gera identificador único para idempotência e rastreio local da fila. */
export function createIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID()
  }
  const randomPart = Math.random().toString(16).slice(2, 10)
  return `raiz-${Date.now().toString(36)}-${randomPart}`
}

function isQueuedReceipt(value: unknown): value is QueuedReceipt {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    typeof record.id === "string" &&
    typeof record.accessKey === "string" &&
    (record.source === "qr" || record.source === "manual") &&
    typeof record.idempotencyKey === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.attempts === "number" &&
    (typeof record.lastErrorCode === "string" || record.lastErrorCode === null)
  )
}

function writeQueue(items: QueuedReceipt[], storage: Storage | null): void {
  if (!storage) {
    return
  }
  try {
    if (items.length === 0) {
      storage.removeItem(SCAN_QUEUE_STORAGE_KEY)
      return
    }
    storage.setItem(SCAN_QUEUE_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Falha de cota/modo privado: evita quebrar o fluxo principal do visitante.
  }
}

/** Lista itens pendentes da fila offline persistida em localStorage. */
export function listQueuedReceipts(storage: Storage | null = getDefaultStorage()): QueuedReceipt[] {
  if (!storage) {
    return []
  }
  try {
    const raw = storage.getItem(SCAN_QUEUE_STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter(isQueuedReceipt)
  } catch {
    return []
  }
}

/** Enfileira cupom sem duplicar a mesma `accessKey` normalizada, preservando `idempotencyKey`. */
export function enqueueReceipt(
  input: EnqueueReceiptInput,
  storage: Storage | null = getDefaultStorage(),
): EnqueueReceiptResult {
  const accessKey = normalizeAccessKey(input.accessKey)
  const items = listQueuedReceipts(storage)
  const existing = items.find((item) => item.accessKey === accessKey)

  if (existing) {
    return { item: existing, items, deduplicated: true }
  }

  const item: QueuedReceipt = {
    id: createIdempotencyKey(),
    accessKey,
    source: input.source,
    idempotencyKey: input.idempotencyKey ?? createIdempotencyKey(),
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastErrorCode: null,
  }

  const next = [...items, item]
  writeQueue(next, storage)
  return { item, items: next, deduplicated: false }
}

/** Registra falha de tentativa mantendo a mesma `idempotencyKey` para o próximo envio. */
export function recordReceiptAttemptFailure(
  id: string,
  errorCode: string,
  storage: Storage | null = getDefaultStorage(),
): QueuedReceipt[] {
  const items = listQueuedReceipts(storage)
  const next = items.map((item) =>
    item.id === id
      ? {
          ...item,
          attempts: item.attempts + 1,
          lastErrorCode: errorCode,
        }
      : item,
  )
  writeQueue(next, storage)
  return next
}

/** Remove um item concluído ou rejeitado definitivamente da fila offline. */
export function removeQueuedReceipt(
  id: string,
  storage: Storage | null = getDefaultStorage(),
): QueuedReceipt[] {
  const next = listQueuedReceipts(storage).filter((item) => item.id !== id)
  writeQueue(next, storage)
  return next
}

/** Limpa toda a fila local de cupons (por exemplo, ao encerrar ou excluir conta). */
export function clearReceiptQueue(storage: Storage | null = getDefaultStorage()): void {
  writeQueue([], storage)
}
