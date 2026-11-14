import { createFileRoute, redirect } from "@tanstack/react-router"

import { RewardDetailView } from "@/features/rewards/ui/views/reward-detail-view"
import { voucherStore } from "@/features/rewards/voucher-store"

export const Route = createFileRoute("/_app/premios/$rewardId")({
  beforeLoad: ({ params }) => {
    if (!voucherStore.getForReward(params.rewardId)) {
      throw redirect({ to: "/premios", replace: true })
    }
  },
  component: RewardDetailPage,
})

function RewardDetailPage() {
  const { rewardId } = Route.useParams()
  return <RewardDetailView rewardId={rewardId} />
}
