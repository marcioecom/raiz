const TOKEN_STORAGE_KEY = "raiz.jwt"

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null
  }
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  if (typeof window === "undefined") {
    return
  }
  try {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } catch {
    // Storage indisponível (ex.: navegação restrita); mantém execução sem quebrar.
  }
}

export function clearToken(): void {
  if (typeof window === "undefined") {
    return
  }
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    // Ignora indisponibilidade de storage.
  }
}

export function hasToken(): boolean {
  return getToken() !== null
}
