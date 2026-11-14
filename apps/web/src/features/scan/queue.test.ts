import { beforeEach, describe, expect, it } from "vitest"

import {
  enqueueReceipt,
  listQueuedReceipts,
  recordReceiptAttemptFailure,
  removeQueuedReceipt,
  SCAN_QUEUE_STORAGE_KEY,
} from "./queue"

const KEY_A = "17260112345678000199650010000001231123456787"
const KEY_B = "35251060746948000112650020000000451876543219"

describe("scan offline queue", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("enfileira cupom persistindo em raiz.scan.queue.v1 e gera Idempotency-Key quando omitida", () => {
    const explicit = enqueueReceipt({
      accessKey: KEY_A,
      source: "manual",
      idempotencyKey: "idem-a",
    })
    const generated = enqueueReceipt({
      accessKey: KEY_B,
      source: "qr",
    })

    expect(explicit.deduplicated).toBe(false)
    expect(explicit.item.accessKey).toBe(KEY_A)
    expect(explicit.item.idempotencyKey).toBe("idem-a")
    expect(explicit.item.attempts).toBe(0)
    expect(explicit.item.lastErrorCode).toBeNull()

    expect(generated.item.idempotencyKey.length).toBeGreaterThan(0)
    const stored = listQueuedReceipts()
    expect(stored).toHaveLength(2)
    expect(window.localStorage.getItem(SCAN_QUEUE_STORAGE_KEY)).toContain(KEY_A)
  })

  it("deduplica pela accessKey normalizada (separadores, | e &) preservando a idempotencyKey original", () => {
    const first = enqueueReceipt({
      accessKey: "1726 0112.3456-7800 0199 6500 1000 0001 2311 2345 6787",
      source: "manual",
      idempotencyKey: "idem-original",
    })

    const secondPipe = enqueueReceipt({
      accessKey: `https://www.sefaz.to.gov.br/nfce/qrcode?p=${KEY_A}|2|1|1|HASH`,
      source: "qr",
      idempotencyKey: "idem-nova-ignorada",
    })
    const thirdAmp = enqueueReceipt({
      accessKey: `https://portal.fazenda.sp.gov.br/nfce?v=2&p=${KEY_A}&tpAmb=1`,
      source: "manual",
      idempotencyKey: "idem-outra-ignorada",
    })

    expect(secondPipe.deduplicated).toBe(true)
    expect(secondPipe.item.id).toBe(first.item.id)
    expect(secondPipe.item.idempotencyKey).toBe("idem-original")
    expect(thirdAmp.deduplicated).toBe(true)
    expect(thirdAmp.item.idempotencyKey).toBe("idem-original")
    expect(listQueuedReceipts()).toHaveLength(1)
  })

  it("registra múltiplas falhas preservando Idempotency-Key e mantendo outros itens intactos", () => {
    const { item: itemA } = enqueueReceipt({
      accessKey: KEY_A,
      source: "qr",
      idempotencyKey: "idem-persistente",
    })
    const { item: itemB } = enqueueReceipt({
      accessKey: KEY_B,
      source: "manual",
      idempotencyKey: "idem-b",
    })

    recordReceiptAttemptFailure(itemA.id, "network_error")
    const updated = recordReceiptAttemptFailure(itemA.id, "rate_limited")

    expect(updated[0]?.attempts).toBe(2)
    expect(updated[0]?.lastErrorCode).toBe("rate_limited")
    expect(updated[0]?.idempotencyKey).toBe("idem-persistente")
    expect(updated[0]?.createdAt).toBe(itemA.createdAt)
    expect(updated[1]).toEqual(itemB)
  })

  it("remove item após envio e apaga a chave de localStorage ao esvaziar a fila", () => {
    const a = enqueueReceipt({ accessKey: KEY_A, source: "qr" })
    const b = enqueueReceipt({ accessKey: KEY_B, source: "manual" })

    const afterFirst = removeQueuedReceipt(a.item.id)
    expect(afterFirst).toHaveLength(1)
    expect(afterFirst[0]?.id).toBe(b.item.id)
    expect(window.localStorage.getItem(SCAN_QUEUE_STORAGE_KEY)).not.toBeNull()

    const afterLast = removeQueuedReceipt(b.item.id)
    expect(afterLast).toEqual([])
    expect(window.localStorage.getItem(SCAN_QUEUE_STORAGE_KEY)).toBeNull()
  })

  it("protege contra JSON corrompido, payload inválido e itens malformados em localStorage", () => {
    window.localStorage.setItem(SCAN_QUEUE_STORAGE_KEY, "{json-corrompido")
    expect(listQueuedReceipts()).toEqual([])

    window.localStorage.setItem(SCAN_QUEUE_STORAGE_KEY, '{"nao":"array"}')
    expect(listQueuedReceipts()).toEqual([])

    window.localStorage.setItem(
      SCAN_QUEUE_STORAGE_KEY,
      JSON.stringify([
        null,
        { id: "incompleto", accessKey: KEY_A },
        {
          id: "valido-1",
          accessKey: KEY_A,
          source: "qr",
          idempotencyKey: "idem-1",
          createdAt: "2026-11-14T00:00:00.000Z",
          attempts: 1,
          lastErrorCode: null,
        },
      ]),
    )
    const recovered = listQueuedReceipts()
    expect(recovered).toHaveLength(1)
    expect(recovered[0]?.idempotencyKey).toBe("idem-1")
  })

  it("não falha quando storage está indisponível ou lança erro de cota", () => {
    expect(listQueuedReceipts(null)).toEqual([])
    const failingStorage = {
      length: 0,
      clear: () => {},
      key: () => null,
      getItem: () => null,
      removeItem: () => {},
      setItem: () => {
        throw new Error("QuotaExceededError")
      },
    } satisfies Storage

    const res = enqueueReceipt({ accessKey: KEY_A, source: "manual" }, failingStorage)
    expect(res.deduplicated).toBe(false)
    expect(res.items).toHaveLength(1)
  })
})
