/** Copia texto para a área de transferência com fallback legado para contextos sem permissão Clipboard API. */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fallback abaixo para contextos sem permissão de Clipboard API.
    }
  }
  if (typeof document === "undefined" || !document.body) {
    return false
  }
  const field = Object.assign(document.createElement("textarea"), { value: text })
  field.setAttribute("readonly", "")
  field.style.cssText = "position:fixed;inset-block-start:0;opacity:0"
  document.body.append(field)
  field.select()
  try {
    return document.execCommand("copy")
  } catch {
    return false
  } finally {
    field.remove()
  }
}
