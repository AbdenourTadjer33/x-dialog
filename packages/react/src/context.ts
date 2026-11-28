import * as React from "react"

import type {
  DialogCloseGuard,
  DialogDefaults,
  DialogDefinition,
  DialogInstance,
  DialogOpenArgs,
} from "./types"

export type DialogActions = {
  /**
   * Open a dialog and await its result.
   *
   * Resolves with the value the surface passed to `resolve`, or with `null`
   * when the dialog was dismissed (close button, Escape, outside click,
   * `dismiss()`, `dismissAll()`, or the provider unmounting).
   */
  open: <Payload, Result>(
    definition: DialogDefinition<Payload, Result>,
    ...args: DialogOpenArgs<Payload>
  ) => Promise<Result | null>
  /** Settle one dialog with a result and close it. Returns `false` if it was not open. */
  resolve: (id: string, result: unknown) => boolean
  /** Settle one dialog with `null` and close it, skipping its close guard. */
  dismiss: (id: string) => boolean
  /** Settle every open dialog with `null`, topmost first, skipping close guards. */
  dismissAll: () => void
  /** Ask one dialog to close. Runs its close guard; resolves to whether it closed. */
  requestClose: (id: string) => Promise<boolean>
  /** Flip one dialog between its normal size and maximized. */
  toggleMaximize: (id: string) => void
  /** Register (or clear, with `null`) the close guard for one dialog. */
  registerCloseGuard: (id: string, guard: DialogCloseGuard | null) => void
}

/** The controls a surface has over the dialog it is rendered in. */
export type DialogInstanceContextValue = {
  id: string
  kind: string
  maximized: boolean
  maximizable: boolean
  /** Whether this dialog is the topmost open one. */
  isTopmost: boolean
  toggleMaximize: () => void
  /** Close, honouring the close guard. */
  requestClose: () => void
  /** Portal target for `DialogTitlebarActions`. */
  titlebarSlot: HTMLElement | null
}

/**
 * Split on purpose: the stack changes on every open and close, the actions
 * never do. Call sites consume actions only, so opening a dialog does not
 * re-render them.
 */
export const DialogActionsContext: React.Context<DialogActions | null> =
  React.createContext<DialogActions | null>(null)
DialogActionsContext.displayName = "DialogActionsContext"

export const DialogStackContext: React.Context<
  readonly DialogInstance[] | null
> = React.createContext<readonly DialogInstance[] | null>(null)
DialogStackContext.displayName = "DialogStackContext"

export const DialogInstanceContext: React.Context<DialogInstanceContextValue | null> =
  React.createContext<DialogInstanceContextValue | null>(null)
DialogInstanceContext.displayName = "DialogInstanceContext"

/** The provider's `defaults`. Empty when none were given. */
export const DialogDefaultsContext: React.Context<DialogDefaults> =
  React.createContext<DialogDefaults>({})
DialogDefaultsContext.displayName = "DialogDefaultsContext"
