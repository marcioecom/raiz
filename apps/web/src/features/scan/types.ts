import type { components } from "@/api/schema"
import type { ScanMode } from "./scan-mode"

export type ReceiptResult = components["schemas"]["ReceiptResult"] & {
  referral_awarded?: number
}
export type { ScanMode }
export type CameraStatus = "starting" | "ready" | "denied" | "unavailable"
export type ManualKeyFormValues = { accessKey: string }
