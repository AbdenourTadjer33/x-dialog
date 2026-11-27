import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    typecheck: {
      include: ["src/**/*.test-d.{ts,tsx}"],
      tsconfig: "./tsconfig.json",
    },
  },
})
