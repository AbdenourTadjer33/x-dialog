import * as React from "react"

import { DialogInstanceContext } from "../context"
import type { DialogInstanceContextValue } from "../context"
import type { DialogCloseGuard } from "../types"
import { useDialogs } from "./use-dialogs"

/** Controls for the dialog the calling surface is rendered in. */
export function useDialog(): DialogInstanceContextValue {
  const instance = React.useContext(DialogInstanceContext)
  if (!instance) {
    throw new Error(
      "[x-dialog] useDialog() must be called inside a dialog surface."
    )
  }
  return instance
}

/**
 * Block closing while the surface has work worth keeping.
 *
 * Runs on Escape, outside click and the close button — one path, so there is
 * no way to close around it. Return `false` (or a promise of it) to stay open.
 * The guard may be async and may open another dialog. `resolve()` and
 * `dismiss()` from inside the surface skip it: they are deliberate.
 *
 * @example
 * const { open } = useDialogs()
 * const isDirty = form.formState.isDirty // read during render
 *
 * useDialogCloseGuard(async () => {
 *   if (!isDirty) return true
 *   return (await open(discardChangesDialog)) === true
 * })
 */
export function useDialogCloseGuard(guard: DialogCloseGuard): void {
  const { id } = useDialog()
  const { registerCloseGuard } = useDialogs()

  // read through a ref so the latest closure runs without re-registering
  const guardRef = React.useRef(guard)
  React.useEffect(() => {
    guardRef.current = guard
  })

  React.useEffect(() => {
    registerCloseGuard(id, () => guardRef.current())
    return () => registerCloseGuard(id, null)
  }, [id, registerCloseGuard])
}
