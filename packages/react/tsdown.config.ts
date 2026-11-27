import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  platform: "neutral",
  target: "es2020",
  dts: true,
  sourcemap: true,
  clean: true,
  // the whole entry is client-only; keep React Server Components from importing it on the server
  banner: { js: '"use client";' },
  // react and react-dom are peer dependencies, which tsdown never bundles
})
