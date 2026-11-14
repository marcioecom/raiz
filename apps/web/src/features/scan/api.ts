import type { ScanSource } from "./queue"
import type { ReceiptResult } from "./types"

import { client, unwrap } from "@/api/client"

export type { ReceiptResult }

export interface SubmitReceiptInput {
  accessKey: string
  source: ScanSource
  idempotencyKey: string
}

/** Envia a chave NFC-e para validação e crédito com `Idempotency-Key` estável. */
export function submitReceipt(input: SubmitReceiptInput): Promise<ReceiptResult> {
  return unwrap(
    client.POST("/v1/receipts", {
      body: {
        access_key: input.accessKey,
        source: input.source,
      },
      headers: {
        "Idempotency-Key": input.idempotencyKey,
      },
    }),
  )
}
