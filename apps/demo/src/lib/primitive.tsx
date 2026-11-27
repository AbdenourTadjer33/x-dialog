import * as React from "react"

import { DialogProvider as BaseDialogProvider } from "@/registry/base/x-dialog"
import { DialogProvider as RadixDialogProvider } from "@/registry/radix/x-dialog"

export type Primitive = "radix" | "base"

const STORAGE_KEY = "x-dialog-demo:primitive"

function initialPrimitive(): Primitive {
  const fromUrl = new URLSearchParams(window.location.search).get("primitive")
  if (fromUrl === "radix" || fromUrl === "base") return fromUrl
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === "base" ? "base" : "radix"
}

const PrimitiveContext = React.createContext<{
  primitive: Primitive
  setPrimitive: (next: Primitive) => void
} | null>(null)

/**
 * Renders the Radix or the Base UI frame. Switching remounts the provider,
 * which settles any open dialog with `null` — exactly what unmounting does
 * in an app.
 */
export function PrimitiveProvider({ children }: { children: React.ReactNode }) {
  const [primitive, setPrimitiveState] = React.useState(initialPrimitive)

  const setPrimitive = React.useCallback((next: Primitive) => {
    localStorage.setItem(STORAGE_KEY, next)
    setPrimitiveState(next)
  }, [])

  const value = React.useMemo(
    () => ({ primitive, setPrimitive }),
    [primitive, setPrimitive]
  )
  const Provider =
    primitive === "base" ? BaseDialogProvider : RadixDialogProvider

  return (
    <PrimitiveContext.Provider value={value}>
      <Provider key={primitive}>{children}</Provider>
    </PrimitiveContext.Provider>
  )
}

export function usePrimitive() {
  const value = React.useContext(PrimitiveContext)
  if (!value)
    throw new Error("usePrimitive must be used inside PrimitiveProvider")
  return value
}
