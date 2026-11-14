import { createContext, useContext } from "react"

export interface DevicePreviewContextValue {
  canTogglePhonePreview: boolean
  isPhonePreviewActive: boolean
  isInsideFrame: boolean
  togglePhonePreview: () => void
  setPhonePreviewActive: (enabled: boolean) => void
  notifyIframeRoute: (href: string) => void
}

export const DevicePreviewContext = createContext<DevicePreviewContextValue>({
  canTogglePhonePreview: false,
  isPhonePreviewActive: false,
  isInsideFrame: false,
  togglePhonePreview: () => undefined,
  setPhonePreviewActive: () => undefined,
  notifyIframeRoute: () => undefined,
})

export function useDevicePreview(): DevicePreviewContextValue {
  return useContext(DevicePreviewContext)
}
