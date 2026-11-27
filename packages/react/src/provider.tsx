import * as React from "react"

import { DialogActionsContext, DialogStackContext } from "./context"
import type { DialogActions } from "./context"
import {
  createDialogInstance,
  dialogStackReducer,
  EMPTY_DIALOG_STACK,
  topmostOpenIndex,
} from "./models/dialog-stack"
import { PendingDialogs } from "./models/pending-dialogs"
import type {
  DialogCloseGuard,
  DialogDefinition,
  DialogInstance,
} from "./types"

/** What the provider hands each frame. Pass it straight to `useDialogFrame`. */
export type DialogFrameProps = {
  instance: DialogInstance
  /** Position in the stack; the bottom-most dialog is 0. */
  index: number
  /** Whether this is the topmost dialog that is still open. */
  isTopmost: boolean
  /** `baseZIndex + index * 10`. */
  zIndex: number
}

export type DialogCloseGuardErrorHandler = (
  error: unknown,
  dialog: { id: string; kind: string }
) => void

export type DialogProviderProps = {
  children?: React.ReactNode
  /**
   * Renders one dialog: the chrome around a surface. The shadcn registry
   * items ship one for Radix and one for Base UI; write your own with
   * `useDialogFrame`.
   */
  frame: React.ComponentType<DialogFrameProps>
  /**
   * How long a closed dialog stays mounted so its exit animation can play,
   * in ms. The caller's promise settles immediately regardless. Default 200.
   */
  exitDuration?: number
  /** z-index of the bottom-most dialog; each stacked dialog adds 10. Default 50. */
  baseZIndex?: number
  /**
   * Called when a close guard throws. The dialog stays open: a failing guard
   * must not discard the user's work. Defaults to `console.error`.
   */
  onCloseGuardError?: DialogCloseGuardErrorHandler
}

const DEFAULT_EXIT_DURATION = 200
const DEFAULT_BASE_Z_INDEX = 50
const Z_INDEX_STEP = 10

const defaultCloseGuardErrorHandler: DialogCloseGuardErrorHandler = (
  error,
  dialog
) => {
  console.error(
    `[x-dialog] The close guard of "${dialog.kind}" (${dialog.id}) threw; the dialog stays open.`,
    error
  )
}

/**
 * Mount once, high in the tree. Provides `useDialogs()` and renders the stack.
 *
 * Dialogs render inside your own React tree, so they share every provider
 * above this one — router, query client, theme, i18n.
 */
export function DialogProvider({
  children,
  frame: Frame,
  exitDuration = DEFAULT_EXIT_DURATION,
  baseZIndex = DEFAULT_BASE_Z_INDEX,
  onCloseGuardError = defaultCloseGuardErrorHandler,
}: DialogProviderProps): React.JSX.Element {
  const [stack, dispatch] = React.useReducer(
    dialogStackReducer,
    EMPTY_DIALOG_STACK
  )

  // lazy initialisers: one instance per provider, stable for its lifetime
  const [pending] = React.useState(() => new PendingDialogs())
  const [exitTimers] = React.useState(
    () => new Map<string, ReturnType<typeof setTimeout>>()
  )

  // read through a ref so the actions object never changes identity
  const options = React.useRef({ exitDuration, onCloseGuardError })
  React.useEffect(() => {
    options.current = { exitDuration, onCloseGuardError }
  })

  const settle = React.useCallback(
    (id: string, result: unknown): boolean => {
      if (!pending.has(id)) return false

      const delay = options.current.exitDuration
      if (delay > 0) {
        dispatch({ type: "close", id })
        exitTimers.set(
          id,
          setTimeout(() => {
            exitTimers.delete(id)
            dispatch({ type: "remove", id })
          }, delay)
        )
      } else {
        dispatch({ type: "remove", id })
      }

      return pending.settle(id, result)
    },
    [exitTimers, pending]
  )

  const open = React.useCallback(
    <Payload, Result>(
      definition: DialogDefinition<Payload, Result>,
      payload?: Payload
    ): Promise<Result | null> => {
      const id = pending.nextId()

      return new Promise<Result | null>((resolvePromise) => {
        pending.add(
          id,
          resolvePromise as (result: unknown) => void,
          definition.kind
        )
        dispatch({
          type: "open",
          instance: createDialogInstance(id, definition, payload),
        })
      })
    },
    [pending]
  )

  const resolve = React.useCallback(
    (id: string, result: unknown) => settle(id, result),
    [settle]
  )

  const dismiss = React.useCallback((id: string) => settle(id, null), [settle])

  const dismissAll = React.useCallback(() => {
    pending
      .ids()
      .reverse()
      .forEach((id) => settle(id, null))
  }, [pending, settle])

  const requestClose = React.useCallback(
    (id: string): Promise<boolean> => {
      if (!pending.has(id)) return Promise.resolve(false)

      return pending.dedupeClose(id, async () => {
        const guard = pending.getGuard(id)

        if (guard) {
          try {
            const allowed = await guard()
            if (!allowed) return false
          } catch (error) {
            // a throwing guard must not discard the user's work, and must not
            // strand them silently either — keep the dialog open and report
            options.current.onCloseGuardError(error, {
              id,
              kind: pending.kindOf(id),
            })
            return false
          }
        }

        return settle(id, null)
      })
    },
    [pending, settle]
  )

  const toggleMaximize = React.useCallback(
    (id: string) => dispatch({ type: "toggle-maximize", id }),
    []
  )

  const registerCloseGuard = React.useCallback(
    (id: string, guard: DialogCloseGuard | null) => pending.setGuard(id, guard),
    [pending]
  )

  // every callback above is stable, so this identity never changes
  const actions = React.useMemo<DialogActions>(
    () => ({
      open: open as DialogActions["open"],
      resolve,
      dismiss,
      dismissAll,
      requestClose,
      toggleMaximize,
      registerCloseGuard,
    }),
    [
      dismiss,
      dismissAll,
      open,
      registerCloseGuard,
      requestClose,
      resolve,
      toggleMaximize,
    ]
  )

  React.useEffect(
    () => () => {
      exitTimers.forEach((timer) => clearTimeout(timer))
      exitTimers.clear()
      // never leave a caller awaiting forever
      pending.settleAll()
      // StrictMode re-runs effects without remounting state: drop the frames
      // whose promises were just settled so they cannot linger on screen
      dispatch({ type: "reset" })
    },
    [exitTimers, pending]
  )

  const topmost = topmostOpenIndex(stack)

  return (
    <DialogActionsContext.Provider value={actions}>
      <DialogStackContext.Provider value={stack}>
        {children}
        {stack.map((instance, index) => (
          <Frame
            key={instance.id}
            instance={instance}
            index={index}
            isTopmost={index === topmost}
            zIndex={baseZIndex + index * Z_INDEX_STEP}
          />
        ))}
      </DialogStackContext.Provider>
    </DialogActionsContext.Provider>
  )
}
