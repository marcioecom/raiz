export type ScanMode = "camera" | "manual"

const DESKTOP_MANUAL_QUERY = "(min-width: 1024px) and (pointer: fine)"

/** Define o modo inicial do scan: digitação manual em desktop com ponteiro fino, câmera no celular. */
export function getInitialScanMode(): ScanMode {
  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(DESKTOP_MANUAL_QUERY).matches
  ) {
    return "manual"
  }

  return "camera"
}
