import { z } from "zod"

export const DEFAULT_API_URL = "https://raiz-api.marcio.run"

const envSchema = z.object({
  VITE_API_URL: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z
      .string()
      .trim()
      .url()
      .default(DEFAULT_API_URL)
      .transform((value) => value.replace(/\/+$/, "")),
  ),
})

/** Valida as variáveis de ambiente do frontend com fallback para a API hospedada. */
export function parseEnv(raw: { VITE_API_URL?: unknown }) {
  return envSchema.parse(raw)
}

export const env = parseEnv({
  VITE_API_URL: import.meta.env.VITE_API_URL,
})
