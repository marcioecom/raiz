import type { RefObject } from "react"
import type { TrackCapabilities } from "../camera-stream"
import type { CameraStatus } from "../types"

import { useCallback, useEffect, useRef, useState } from "react"

import { cropPlan, lockNormalZoom, openBackStream, stopStream } from "../camera-stream"

export type { CameraStatus }

type CameraState = { status: CameraStatus; torchSupported: boolean; torchEnabled: boolean }
type QrDetector = { detect(source: HTMLVideoElement): Promise<Array<{ rawValue?: string }>> }
type BarcodeDetectorCtor = {
  new (options?: { formats?: string[] }): QrDetector
  getSupportedFormats?: () => Promise<string[]>
}
type JsQrDecode = (
  data: Uint8ClampedArray,
  w: number,
  h: number,
  opts?: { inversionAttempts?: "dontInvert" },
) => { data: string } | null
interface DecoderRuntime {
  native: QrDetector | null
  jsQr: JsQrDecode | null
  canvas: HTMLCanvasElement | null
  ctx: CanvasRenderingContext2D | null
  pass: number
}
export interface UseQrCameraOptions {
  enabled: boolean
  isBusyRef: RefObject<boolean>
  onDetect: (rawQr: string) => Promise<void> | void
}

const hasMediaDevices = () =>
  typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia)
const initialState = (
  status: CameraStatus = hasMediaDevices() ? "starting" : "unavailable",
): CameraState => ({ status, torchSupported: false, torchEnabled: false })

async function createDecoderRuntime(): Promise<DecoderRuntime> {
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
  try {
    const formats = ctor?.getSupportedFormats ? await ctor.getSupportedFormats() : ["qr_code"]
    if (ctor && formats.includes("qr_code")) {
      return {
        native: new ctor({ formats: ["qr_code"] }),
        jsQr: null,
        canvas: null,
        ctx: null,
        pass: 0,
      }
    }
  } catch {
    // Fallback para jsQR abaixo caso BarcodeDetector falhe ao consultar formatos.
  }
  const raw = (await import("jsqr")).default as unknown
  const jsQr =
    typeof raw === "function"
      ? (raw as JsQrDecode)
      : ((raw as { default?: JsQrDecode })?.default ?? null)
  return { native: null, jsQr, canvas: null, ctx: null, pass: 0 }
}

/** Decodifica em duas escalas alternadas: o frame todo e depois só a área da mira, ampliada. */
const DECODE_SHARES = [1, 0.6]

async function detectQr(video: HTMLVideoElement, rt: DecoderRuntime): Promise<string | null> {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth <= 0) return null
  if (rt.native)
    return (await rt.native.detect(video)).find((e) => Boolean(e.rawValue))?.rawValue ?? null
  if (!rt.jsQr) return null
  const { sx, sy, size, out } = cropPlan(
    video.videoWidth,
    video.videoHeight,
    DECODE_SHARES[rt.pass++ % DECODE_SHARES.length],
  )
  const canvas = (rt.canvas ??= document.createElement("canvas"))
  if (canvas.width !== out || canvas.height !== out)
    Object.assign(canvas, { width: out, height: out })
  const ctx = (rt.ctx ??= canvas.getContext("2d", { willReadFrequently: true }))
  if (!ctx) return null
  ctx.drawImage(video, sx, sy, size, size, 0, 0, out, out)
  const { data } = ctx.getImageData(0, 0, out, out)
  return rt.jsQr(data, out, out, { inversionAttempts: "dontInvert" })?.data ?? null
}

/** Gerencia stream de câmera traseira, leitura QR (`BarcodeDetector` / `jsqr`) e lanterna. */
export function useQrCamera({ enabled, isBusyRef, onDetect }: UseQrCameraOptions) {
  const [camera, setCamera] = useState<CameraState>(() => initialState())
  const [attempt, setAttempt] = useState(0)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const trackRef = useRef<MediaStreamTrack | null>(null)
  const lastHandledQrRef = useRef<string | null>(null)
  const onDetectRef = useRef(onDetect)

  useEffect(() => {
    onDetectRef.current = onDetect
  }, [onDetect])

  useEffect(() => {
    if (!enabled || !hasMediaDevices()) return
    let cancelled = false
    let scanTimer: number | null = null
    let stream: MediaStream | null = null

    void (async () => {
      try {
        stream = await openBackStream()
        if (cancelled) return stopStream(stream)
        const [track] = stream.getVideoTracks()
        trackRef.current = track ?? null
        void lockNormalZoom(track)
        const caps = track?.getCapabilities?.() as TrackCapabilities | undefined
        if (videoRef.current) {
          Object.assign(videoRef.current, { muted: true, srcObject: stream })
          await videoRef.current.play().catch(() => {})
        }
        if (cancelled) return
        setCamera({ status: "ready", torchSupported: Boolean(caps?.torch), torchEnabled: false })
        const runtime = await createDecoderRuntime()
        const tick = async () => {
          if (cancelled) return
          if (videoRef.current && !isBusyRef.current) {
            try {
              const rawQr = await detectQr(videoRef.current, runtime)
              if (rawQr && rawQr !== lastHandledQrRef.current && !cancelled) {
                lastHandledQrRef.current = rawQr
                await onDetectRef.current(rawQr)
              }
            } catch {
              // Ignora erro pontual de frame e segue lendo.
            }
          }
          if (!cancelled) scanTimer = window.setTimeout(() => void tick(), 220)
        }
        if (!cancelled) scanTimer = window.setTimeout(() => void tick(), 250)
      } catch (error) {
        if (cancelled) return
        const denied =
          error instanceof Error &&
          ["NotAllowedError", "PermissionDeniedError"].includes(error.name)
        setCamera(initialState(denied ? "denied" : "unavailable"))
      }
    })()

    return () => {
      cancelled = true
      if (scanTimer !== null) window.clearTimeout(scanTimer)
      trackRef.current = null
      stopStream(stream)
    }
  }, [enabled, attempt, isBusyRef])

  const resetCamera = useCallback(() => {
    lastHandledQrRef.current = null
    setCamera(initialState())
  }, [])
  const retryCamera = useCallback(() => {
    resetCamera()
    setAttempt((prev) => prev + 1)
  }, [resetCamera])
  const toggleTorch = useCallback(async () => {
    const track = trackRef.current
    if (!track || !camera.torchSupported) return
    const next = !camera.torchEnabled
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet & { torch?: boolean }],
      })
      setCamera((prev) => ({ ...prev, torchEnabled: next }))
    } catch {
      setCamera((prev) => ({ ...prev, torchSupported: false, torchEnabled: false }))
    }
  }, [camera.torchEnabled, camera.torchSupported])

  return {
    videoRef,
    cameraStatus: camera.status,
    torchSupported: camera.torchSupported,
    torchEnabled: camera.torchEnabled,
    resetCamera,
    retryCamera,
    toggleTorch: () => void toggleTorch(),
  }
}
