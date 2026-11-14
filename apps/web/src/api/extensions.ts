import type { components, paths } from "@/api/schema"

import { client, isEndpointNotImplemented, requestExtensionJson, unwrap } from "@/api/client"

export type ServiceMeta =
  paths["/v1/meta"]["get"]["responses"]["200"]["content"]["application/json"]

export type BaseRedemption = components["schemas"]["Redemption"]
export type RedemptionStatus = "pending" | "used" | "expired"

export type ServerRedemption = Omit<BaseRedemption, "balance_after"> & {
  status?: RedemptionStatus
  used_at?: string | null
  balance_after?: number
  created_at?: string
}

export interface MyRedemptionsResult {
  items: ServerRedemption[]
  supported: boolean
}

/** Busca metadados do serviço (`GET /v1/meta`), compartilhado entre telas autenticadas e entrada. */
export function fetchServiceMeta(): Promise<ServiceMeta> {
  return unwrap(client.GET("/v1/meta"))
}

/** Lista resgates do visitante (`GET /v1/me/redemptions`) com degradação graciosa em 404. */
export async function fetchMyRedemptions(): Promise<MyRedemptionsResult> {
  try {
    const data = await requestExtensionJson<{ items?: ServerRedemption[] }>("/v1/me/redemptions")
    return {
      items: Array.isArray(data.items) ? data.items : [],
      supported: true,
    }
  } catch (error) {
    if (isEndpointNotImplemented(error)) {
      return { items: [], supported: false }
    }
    throw error
  }
}
