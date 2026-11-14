import { createFileRoute } from "@tanstack/react-router"

import { RewardsView } from "@/features/rewards/ui/views/rewards-view"

export const Route = createFileRoute("/_app/premios/")({
  component: RewardsPage,
})

function RewardsPage() {
  return <RewardsView />
}
