import * as React from "react"

import { DialogActionsContext, DialogStackContext } from "../context"
import type { DialogActions } from "../context"
import type { DialogInstance } from "../types"

/**
 * Open and control dialogs from any component under `<DialogProvider>`.
 *
 * The returned object never changes identity, so it is safe in dependency
 * arrays and does not re-render the caller when dialogs open or close.
 *
 * @example
 * const { open } = useDialogs()
 * const name = await open(renameDialog, { name: file.name })
 * if (name === null) return // dismissed
 */
export function useDialogs(): DialogActions {
  const actions = React.useContext(DialogActionsContext)
  if (!actions) {
    throw new Error(
      "[x-dialog] useDialogs() must be called inside <DialogProvider>."
    )
  }
  return actions
}

/**
 * The open stack, bottom-most first. Re-renders on every open and close —
 * use it for things like "is any dialog open", not for opening dialogs.
 */
export function useDialogStack(): readonly DialogInstance[] {
  const stack = React.useContext(DialogStackContext)
  if (!stack) {
    throw new Error(
      "[x-dialog] useDialogStack() must be called inside <DialogProvider>."
    )
  }
  return stack
}
