import { describe, expect, it } from "vitest"

import { pickRearCameraId } from "./camera-stream"

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
