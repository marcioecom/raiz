import type { components } from "@/api/schema"

import { client, unwrap } from "@/api/client"

export type HomeData = components["schemas"]["Home"]

/** Busca o agregado único da tela inicial (`GET /v1/home`). */
export function getHome(): Promise<HomeData> {
  return unwrap(client.GET("/v1/home"))
}
