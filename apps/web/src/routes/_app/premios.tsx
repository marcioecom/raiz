import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/premios")({
  component: RewardsLayout,
})

function RewardsLayout() {
  return <Outlet />
}
