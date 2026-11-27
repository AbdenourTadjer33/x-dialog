import type * as React from "react"
import { createPortal } from "react-dom"

import { useDialog } from "./hooks/use-dialog"

/**
 * Render children into the dialog's titlebar, next to the maximize and close
 * buttons. Use it from inside a surface.
 */
export function DialogTitlebarActions({
  children,
}: {
  children?: React.ReactNode
}): React.ReactPortal | null {
  const { titlebarSlot } = useDialog()
  if (!titlebarSlot) return null
  return createPortal(children, titlebarSlot)
}
