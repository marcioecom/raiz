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

export async function openBackStream(): Promise<MediaStream> {
  const fallbackConstraints: MediaTrackConstraints = { facingMode: { ideal: "environment" } }
  const stream = await openVideo(fallbackConstraints)
  const devices = await navigator.mediaDevices.enumerateDevices().catch(() => [])
  const deviceId = pickRearCameraId(devices)
  if (!deviceId || stream.getVideoTracks()[0]?.getSettings().deviceId === deviceId) return stream
  // iOS não abre uma segunda câmera com a primeira ativa: solta o stream e reabre a lente certa.
  stopStream(stream)
  try {
    return await openVideo({ deviceId: { exact: deviceId } })
  } catch {
    return openVideo(fallbackConstraints)
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
