export const PHONE_FRAME_NAME = "raiz-phone-frame"
export const PHONE_PREVIEW_STORAGE_KEY = "raiz.device_preview"
export const PHONE_ROUTE_MESSAGE_TYPE = "raiz:phone-preview-route"
export const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)"

function getDefaultSessionStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null
  }
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export interface FrameWindowLike {
  self: unknown
  top: unknown
  name: string
}

/** Detecta se a página atual está executando dentro do iframe do simulador mobile. */
export function isInsidePhoneFrame(
  win: FrameWindowLike | undefined = typeof window !== "undefined" ? window : undefined,
): boolean {
  if (!win) {
    return false
  }
  try {
    return win.self !== win.top && win.name === PHONE_FRAME_NAME
  } catch {
    return false
  }
}

/** Lê a preferência de simulação mobile persistida na sessão atual da aba. */
export function readDevicePreviewPreference(
  storage: Storage | null = getDefaultSessionStorage(),
): boolean {
  if (!storage) {
    return false
  }
  try {
    return storage.getItem(PHONE_PREVIEW_STORAGE_KEY) === "mobile"
  } catch {
    return false
  }
}

/** Grava ou limpa a preferência de simulação mobile na sessão atual da aba. */
export function writeDevicePreviewPreference(
  enabled: boolean,
  storage: Storage | null = getDefaultSessionStorage(),
): void {
  if (!storage) {
    return
  }
  try {
    if (enabled) {
      storage.setItem(PHONE_PREVIEW_STORAGE_KEY, "mobile")
      return
    }
    storage.removeItem(PHONE_PREVIEW_STORAGE_KEY)
  } catch {
    // Ignora falha de storage em navegadores restritivos sem interromper a UI.
  }
}

/** Valida se um href recebido via postMessage é um caminho interno relativo à raiz. */
export function isSafeInternalHref(href: unknown): href is string {
  if (typeof href !== "string") {
    return false
  }
  if (!href.startsWith("/") || href.startsWith("//") || href.startsWith("/\\")) {
    return false
  }
  for (let index = 0; index < href.length; index += 1) {
    const code = href.charCodeAt(index)
    if (code < 0x20 || code === 0x7f) {
      return false
    }
  }
  return true
}

/** Valida origem estrita e payload da mensagem de sincronização de rota do iframe. */
export function parsePhoneRouteMessage(
  data: unknown,
  eventOrigin: string,
  expectedOrigin: string,
): string | null {
  if (!expectedOrigin || eventOrigin !== expectedOrigin) {
    return null
  }
  if (typeof data !== "object" || data === null) {
    return null
  }
  const record = data as Record<string, unknown>
  if (record.type !== PHONE_ROUTE_MESSAGE_TYPE) {
    return null
  }
  return isSafeInternalHref(record.href) ? record.href : null
}

/** Captura pathname + search + hash atual da janela para inicializar o iframe. */
export function getCurrentWindowHref(
  win: { location: Pick<Location, "pathname" | "search" | "hash"> } | undefined = typeof window !==
  "undefined"
    ? window
    : undefined,
): string {
  if (!win) {
    return "/"
  }
  const href = `${win.location.pathname}${win.location.search}${win.location.hash}`
  return isSafeInternalHref(href) ? href : "/"
}
