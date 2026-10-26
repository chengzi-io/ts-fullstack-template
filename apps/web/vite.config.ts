import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Dev-server only (not VITE_-prefixed, never shipped to the browser). Set it
  // when apps/server runs on another port, e.g. a second worktree.
  const { API_PROXY_TARGET } = loadEnv(mode, import.meta.dirname, "API_");

  return {
    plugins: [
      // Must run before @vitejs/plugin-react (TanStack Router requirement)
      tanstackRouter({
        autoCodeSplitting: true,
        target: "react",
      }),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    // Dev: browser calls same-origin /trpc/* → apps/server
    server: {
      proxy: {
        "/trpc": {
          changeOrigin: true,
          target: API_PROXY_TARGET ?? "http://localhost:3000",
        },
      },
    },
  };
});
