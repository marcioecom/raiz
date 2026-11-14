import { QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { registerSW } from "virtual:pwa-register"

import { queryClient, router } from "@/router"

import "@/styles.css"

registerSW({ immediate: true })

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
