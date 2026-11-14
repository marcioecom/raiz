import { createFileRoute } from "@tanstack/react-router"

import { HomeView } from "@/features/home/ui/views/home-view"

export const Route = createFileRoute("/_app/")({
  component: HomePage,
})

function HomePage() {
  return <HomeView />
}
