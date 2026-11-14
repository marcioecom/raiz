import { createFileRoute } from "@tanstack/react-router"

import { WalletView } from "@/features/wallet/ui/views/wallet-view"

export const Route = createFileRoute("/_app/carteira")({
  component: WalletPage,
})

function WalletPage() {
  return <WalletView />
}
