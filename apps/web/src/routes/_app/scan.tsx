import { createFileRoute } from "@tanstack/react-router"

import { ScanView } from "@/features/scan/ui/views/scan-view"

export const Route = createFileRoute("/_app/scan")({
  component: ScanPage,
})

function ScanPage() {
  return <ScanView />
}
