import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const root = resolve(import.meta.dirname, "../..")

export default defineConfig({
  base: process.env.DEMO_BASE ?? "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      // the registry items, straight from source — the demo runs what ships
      { find: /^@\/registry\//, replacement: `${root}/registry/` },
      // the engine from source, so edits hot-reload without a package build
      {
        find: /^@x-dialog\/react$/,
        replacement: `${root}/packages/react/src/index.ts`,
      },
      { find: /^@\//, replacement: `${resolve(import.meta.dirname, "src")}/` },
    ],
    dedupe: [
      "react",
      "react-dom",
      "radix-ui",
      "@base-ui/react",
      "lucide-react",
    ],
  },
  server: {
    fs: { allow: [root] },
  },
})
