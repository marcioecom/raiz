/** Seleção da lente e abertura do stream da câmera traseira (sem React). */

export type TrackCapabilities = MediaTrackCapabilities & {
  torch?: boolean
  zoom?: { min?: number; max?: number }
}

export const stopStream = (stream: MediaStream | null) =>
  stream?.getTracks().forEach((t) => t.stop())

const isRearLabel = (label: string) => /back|rear|traseira|trás|environment/i.test(label)
const isUltraWideLabel = (label: string) => /ultra|gran angular|grande angular/i.test(label)
const labelRank = (label: string) =>
  /back camera|traseira$/i.test(label.trim()) ? 0 : /dual|triple|wide/i.test(label) ? 1 : 2

/**
 * No iPhone o `facingMode: environment` pode cair na lente ultrawide, que não dá foco no QR.
 * Escolhe a traseira "normal" pelo rótulo (navegadores que escondem labels devolvem `null`).
 */
export function pickRearCameraId(devices: MediaDeviceInfo[]): string | null {
  const rears = devices.filter(
    (device) =>
      device.kind === "videoinput" &&
      Boolean(device.deviceId) &&
      isRearLabel(device.label) &&
      !isUltraWideLabel(device.label),
  )
  return rears.sort((a, b) => labelRank(a.label) - labelRank(b.label))[0]?.deviceId ?? null
}

const openVideo = (video: MediaTrackConstraints) =>
  navigator.mediaDevices.getUserMedia({ video, audio: false })

/**
 * Alta resolução + foco contínuo: cupom de papel tem QR pequeno e sem pixel de sobra
 * nenhum decoder lê. `ideal` nunca quebra o aparelho que não suporta.
 */
const videoConstraints = (extra: MediaTrackConstraints = {}): MediaTrackConstraints => ({
  facingMode: { ideal: "environment" },
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet & { focusMode?: string }],
  ...extra,
})

export async function openBackStream(): Promise<MediaStream> {
  const stream = await openVideo(videoConstraints())
  const devices = await navigator.mediaDevices.enumerateDevices().catch(() => [])
  const deviceId = pickRearCameraId(devices)
  if (!deviceId || stream.getVideoTracks()[0]?.getSettings().deviceId === deviceId) return stream
  // iOS não abre uma segunda câmera com a primeira ativa: solta o stream e reabre a lente certa.
  stopStream(stream)
  try {
    return await openVideo(videoConstraints({ deviceId: { exact: deviceId } }))
  } catch {
    return openVideo(videoConstraints())
  }
}

/** Lado máximo (px) entregue ao decoder por tentativa. */
const MAX_DECODE_SIDE = 1024
/** Abaixo disso o jsQR não acha os padrões de localização do QR. */
const MIN_DECODE_SIDE = 720

export interface CropPlan {
  sx: number
  sy: number
  size: number
  out: number
}

/**
 * Recorte central quadrado do frame (`share` do lado menor), reescalado para pelo menos
 * `MIN_DECODE_SIDE`: subir o QR pequeno ajuda o jsQR mais do que ler o frame inteiro.
 */
export function cropPlan(vw: number, vh: number, share: number): CropPlan {
  const size = Math.round(Math.min(vw, vh) * share)
  return {
    sx: (vw - size) / 2,
    sy: (vh - size) / 2,
    size,
    out: Math.min(MAX_DECODE_SIDE, Math.max(MIN_DECODE_SIDE, size)),
  }
}

/** Trava o zoom no 1x quando o aparelho expõe controle de zoom (evita ficar em 0,5x). */
export async function lockNormalZoom(track?: MediaStreamTrack) {
  const caps = track?.getCapabilities?.() as TrackCapabilities | undefined
  if (!caps?.zoom) return
  const zoom = Math.min(caps.zoom.max ?? 1, Math.max(1, caps.zoom.min ?? 1))
  try {
    await track?.applyConstraints({
      advanced: [{ zoom } as MediaTrackConstraintSet & { zoom?: number }],
    })
  } catch {
    // Zoom pode não ser aplicável; a lente escolhida já resolve o campo de visão.
  }
}
