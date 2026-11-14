import { createFileRoute } from "@tanstack/react-router"

import { RewardDetailView } from "@/features/rewards/ui/views/reward-detail-view"

export const Route = createFileRoute("/_app/premios/$rewardId")({
  component: RewardDetailPage,
})

function RewardDetailPage() {
  const { rewardId } = Route.useParams()
  return <RewardDetailView rewardId={rewardId} />
}
