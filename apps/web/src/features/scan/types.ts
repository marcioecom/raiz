import type { components } from "@/api/schema"

export type ReceiptResult = components["schemas"]["ReceiptResult"]
export type ScanMode = "camera" | "manual"
export type CameraStatus = "starting" | "ready" | "denied" | "unavailable"
export type ManualKeyFormValues = { accessKey: string }
