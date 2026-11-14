import { fileURLToPath } from "node:url"

import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const apiTarget = (env.VITE_API_URL || "https://raiz-api.marcio.run").replace(/\/+$/, "")

  return {
    plugins: [
      tanstackRouter({
        target: "react",
        autoCodeSplitting: true,
        routesDirectory: "src/routes",
        generatedRouteTree: "src/route-tree.gen.ts",
      }),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["raiz-icon.svg"],
        manifest: {
          name: "Raiz — Capim Dourado Shopping",
          short_name: "Raiz",
          description: "Quem volta, cria raiz. Clube de benefícios do Capim Dourado Shopping.",
          lang: "pt-BR",
          start_url: "/",
          display: "standalone",
          background_color: "#FAF8F3",
          theme_color: "#1F3A2E",
          icons: [
            {
              src: "/raiz-icon.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any maskable",
            },
          ],
        },
        workbox: {
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/v1\//, /^\/healthz$/, /^\/docs/, /^\/openapi\.yaml$/],
        },
      }),
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      proxy: {
        "/v1": {
          target: apiTarget,
          changeOrigin: true,
        },
        "/healthz": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
