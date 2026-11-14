import { createFileRoute } from "@tanstack/react-router"

import { authSearchSchema } from "@/features/auth/phone"
import { LoginView } from "@/features/auth/ui/views/login-view"

export const Route = createFileRoute("/_auth/entrar")({
  validateSearch: authSearchSchema,
  component: LoginPage,
})

function LoginPage() {
  const { passo } = Route.useSearch()
  return <LoginView passo={passo} />
}
