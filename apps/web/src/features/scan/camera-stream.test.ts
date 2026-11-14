import { describe, expect, it } from "vitest"

import { cropPlan, pickRearCameraId } from "./camera-stream"

const camera = (deviceId: string, label: string) =>
  ({ deviceId, label, kind: "videoinput" }) as MediaDeviceInfo

describe("pickRearCameraId", () => {
  it("prefere a câmera traseira normal do iPhone no lugar da ultrawide", () => {
    const devices = [
      camera("front", "Front Camera"),
      camera("ultra", "Back Ultra Wide Camera"),
      camera("dual", "Back Dual Wide Camera"),
      camera("main", "Back Camera"),
    ]
    expect(pickRearCameraId(devices)).toBe("main")
  })

  it("ignora ultrawide quando só existem lentes nomeadas", () => {
    const devices = [
      camera("ultra", "Back Ultra Wide Camera"),
      camera("tele", "Back Telephoto Camera"),
    ]
    expect(pickRearCameraId(devices)).toBe("tele")
  })

  it("cai na câmera traseira do Android pelo rótulo 'facing back'", () => {
    const devices = [
      camera("front", "camera2 1, facing front"),
      camera("back", "camera2 0, facing back"),
    ]
    expect(pickRearCameraId(devices)).toBe("back")
  })

  it("devolve null quando os rótulos estão ocultos (navegador sem permissão de label)", () => {
    expect(pickRearCameraId([camera("a", ""), camera("b", "")])).toBeNull()
  })
})

describe("cropPlan", () => {
  it("recorta o quadrado central de um frame 16:9 sem cortar o quadro", () => {
    expect(cropPlan(1920, 1080, 1)).toEqual({ sx: 420, sy: 0, size: 1080, out: 1024 })
  })

  it("amplia a área da mira para o decoder enxergar QR pequeno", () => {
    expect(cropPlan(1920, 1080, 0.6)).toEqual({ sx: 636, sy: 216, size: 648, out: 720 })
  })

  it("sobe stream de baixa resolução em vez de entregar 480px ao jsQR", () => {
    expect(cropPlan(640, 480, 1)).toEqual({ sx: 80, sy: 0, size: 480, out: 720 })
  })

  it("funciona com o frame em retrato", () => {
    expect(cropPlan(1080, 1920, 1)).toEqual({ sx: 0, sy: 420, size: 1080, out: 1024 })
  })
})
