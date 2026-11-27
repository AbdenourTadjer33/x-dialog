import * as React from "react"

import { DialogInstanceContext } from "../context"
import type { DialogInstanceContextValue } from "../context"
import type { DialogFrameProps } from "../provider"
import type { DialogHeight, DialogWidth } from "../types"
import {
  findInitialFocus,
  isIgnoredOutsideTarget,
  resolveDialogText,
} from "../utils"
import { useDialogs } from "./use-dialogs"
import { useDragTransform } from "./use-drag-transform"

/** Everything a frame needs to render one dialog. */
export type DialogFrameState = {
  id: string
  kind: string
  /** Resolved title — render it as the dialog's accessible title. */
  title: string
  /** Resolved description, if the definition has one. */
  description: string | undefined
  icon: React.ComponentType<{ className?: string }> | undefined
  width: DialogWidth
  height: DialogHeight
  /** `false` once the dialog is closing; pass it to the primitive's `open`. */
  open: boolean
  maximized: boolean
  maximizable: boolean
  draggable: boolean
  isTopmost: boolean
  zIndex: number
  /** Close through the close guard — wire the titlebar close button to it. */
  requestClose: () => void
  /** Maximize/restore, remembering the dragged position. */
  toggleMaximize: () => void
  /** Call when the primitive reports Escape. Applies `closeOnEscape` and topmost-only. */
  handleEscapeKey: () => void
  /**
   * Call when the primitive reports an outside press, with the press target.
   * Applies `closeOnOutsideClick` and topmost-only, and ignores presses on
   * toasts and on anything inside `[data-dialog-ignore-outside]`.
   */
  handleOutsidePress: (target?: EventTarget | null) => void
  /** Callback ref for a wrapper around the popup; it receives the drag transform. */
  setDragLayer: (node: HTMLDivElement | null) => void
  /** Callback ref for the titlebar, the drag handle. Inert when not draggable. */
  setDragHandle: (node: HTMLElement | null) => void
  /** Callback ref for the element `Dialog.TitlebarActions` portals into. */
  setTitlebarSlot: (node: HTMLElement | null) => void
  /** Callback ref for the element that wraps `surface`. */
  setSurface: (node: HTMLDivElement | null) => void
  /** The element to focus on open: `[data-autofocus]`, else the first tabbable in the surface. */
  getInitialFocus: () => HTMLElement | null
  /**
   * Focus whatever had focus when the dialog opened — the button that opened
   * it, or the field of the dialog beneath. Returns `false` if that element is
   * gone, so the frame can fall back. Promise dialogs have no trigger, so
   * primitives that return focus to "the trigger" need this.
   */
  restoreFocus: () => boolean
  /** The surface, already wrapped in its instance context. Render it once. */
  surface: React.ReactElement
}

/**
 * The headless half of a frame.
 *
 * Resolves the definition's options, owns drag and maximize geometry, routes
 * every close through the close guard, and renders the surface inside its
 * instance context. A frame only adds markup and the primitive (Radix,
 * Base UI, …).
 */
export function useDialogFrame({
  instance,
  isTopmost,
  zIndex,
}: DialogFrameProps): DialogFrameState {
  const { definition, id, maximized, payload, phase } = instance
  const actions = useDialogs()

  const width = definition.width ?? "lg"
  const height = definition.height ?? "auto"
  const maximizable = definition.maximizable ?? true
  const draggable = definition.draggable ?? true
  const closeOnEscape = definition.closeOnEscape ?? true
  const closeOnOutsideClick = definition.closeOnOutsideClick ?? true

  const title = resolveDialogText(definition.title, payload) ?? ""
  const description = resolveDialogText(definition.description, payload)
  const Surface = definition.component

  const [titlebarSlot, setTitlebarSlot] = React.useState<HTMLElement | null>(
    null
  )
  const surfaceRef = React.useRef<HTMLDivElement | null>(null)

  // read once, on the first render: that is when the opener still has focus
  const [returnFocusTarget] = React.useState<HTMLElement | null>(() =>
    typeof document === "undefined"
      ? null
      : (document.activeElement as HTMLElement | null)
  )

  const drag = useDragTransform({ isDisabled: maximized || !draggable })
  const restorePosition = React.useRef({ x: 0, y: 0 })

  const { position, resetPosition, setPosition, setDragHandle } = drag

  // Callback refs, not ref objects: a frame reads `frame.*` during render, and
  // an object holding refs would make every one of those reads a ref read.
  const dragLayerElementRef = drag.dragLayerRef
  const setDragLayer = React.useCallback(
    (node: HTMLDivElement | null) => {
      dragLayerElementRef.current = node
    },
    [dragLayerElementRef]
  )
  const setSurface = React.useCallback((node: HTMLDivElement | null) => {
    surfaceRef.current = node
  }, [])
  const { toggleMaximize: toggleMaximizeInStack } = actions

  const toggleMaximize = React.useCallback(() => {
    if (!maximizable) return
    if (!maximized) {
      restorePosition.current = { ...position.current }
      resetPosition()
    } else {
      setPosition(restorePosition.current)
    }
    toggleMaximizeInStack(id)
  }, [
    id,
    maximizable,
    maximized,
    position,
    resetPosition,
    setPosition,
    toggleMaximizeInStack,
  ])

  const { requestClose: requestCloseById } = actions
  const requestClose = React.useCallback(() => {
    void requestCloseById(id)
  }, [id, requestCloseById])

  const handleEscapeKey = React.useCallback(() => {
    if (closeOnEscape && isTopmost) requestClose()
  }, [closeOnEscape, isTopmost, requestClose])

  const handleOutsidePress = React.useCallback(
    (target?: EventTarget | null) => {
      if (!closeOnOutsideClick || !isTopmost) return
      if (isIgnoredOutsideTarget(target)) return
      requestClose()
    },
    [closeOnOutsideClick, isTopmost, requestClose]
  )

  const getInitialFocus = React.useCallback(
    () => findInitialFocus(surfaceRef.current),
    []
  )

  const restoreFocus = React.useCallback((): boolean => {
    const target = returnFocusTarget
    if (!target || !target.isConnected || target === document.body) return false
    target.focus({ preventScroll: true })
    return document.activeElement === target
  }, [returnFocusTarget])

  const instanceValue = React.useMemo<DialogInstanceContextValue>(
    () => ({
      id,
      kind: definition.kind,
      maximized,
      maximizable,
      isTopmost,
      toggleMaximize,
      requestClose,
      titlebarSlot,
    }),
    [
      definition.kind,
      id,
      isTopmost,
      maximizable,
      maximized,
      requestClose,
      titlebarSlot,
      toggleMaximize,
    ]
  )

  const { resolve, dismiss } = actions
  const surfaceProps = React.useMemo(
    () => ({
      payload: payload as never,
      resolve: (result: unknown) => {
        resolve(id, result)
      },
      dismiss: () => {
        dismiss(id)
      },
    }),
    [dismiss, id, payload, resolve]
  )

  const surface = (
    <DialogInstanceContext.Provider value={instanceValue}>
      <Surface {...surfaceProps} />
    </DialogInstanceContext.Provider>
  )

  return {
    id,
    kind: definition.kind,
    title,
    description,
    icon: definition.icon,
    width,
    height,
    open: phase === "open",
    maximized,
    maximizable,
    draggable,
    isTopmost,
    zIndex,
    requestClose,
    toggleMaximize,
    handleEscapeKey,
    handleOutsidePress,
    setDragLayer,
    setDragHandle,
    setTitlebarSlot,
    setSurface,
    getInitialFocus,
    restoreFocus,
    surface,
  }
}
