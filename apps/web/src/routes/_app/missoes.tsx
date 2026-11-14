import { createFileRoute } from "@tanstack/react-router"

import { MissionsView } from "@/features/missions/ui/views/missions-view"

export const Route = createFileRoute("/_app/missoes")({
  component: MissionsPage,
})

function MissionsPage() {
  return <MissionsView />
}
