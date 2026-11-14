import { QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { registerSW } from "virtual:pwa-register"

import { queryClient, router } from "@/router"

import "@/styles.css"

registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    // O iOS mantém o PWA vivo no app switcher, então a checagem de versão só rodava no
    // primeiro load. Ao voltar para o app, procura SW novo e o plugin recarrega sozinho.
    // shortcut: um envio em voo no instante do reload se perde, aceitável no MVP.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void registration.update()
    })
  },
})

const rootElement = document.getElementById("root")
if (!rootElement) {
  throw new Error("Elemento #root não encontrado no documento.")
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
