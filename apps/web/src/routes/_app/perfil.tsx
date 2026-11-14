import { createFileRoute } from "@tanstack/react-router"

import { ProfileView } from "@/features/profile/ui/views/profile-view"

export const Route = createFileRoute("/_app/perfil")({
  component: ProfilePage,
})

function ProfilePage() {
  return <ProfileView />
}
