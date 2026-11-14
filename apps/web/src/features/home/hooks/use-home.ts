import { useQuery } from "@tanstack/react-query"

import { getHome } from "../api"

export const homeKeys = {
  all: () => ["home"] as const,
  detail: () => [...homeKeys.all(), "detail"] as const,
}

/** Carrega o agregado único da tela inicial via `GET /v1/home`. */
export function useHomeQuery() {
  return useQuery({
    queryKey: homeKeys.detail(),
    queryFn: getHome,
  })
}
