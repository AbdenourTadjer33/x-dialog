import * as React from "react"

export type DragPosition = { x: number; y: number }

export type UseDragTransformOptions = {
  /** Disable dragging, e.g. while maximized. */
  isDisabled?: boolean
  /** Let the element be dragged past the viewport edges. */
  allowOverflow?: boolean
  /** Minimum gap kept between the element and the viewport edge, in px. */
  margin?: number
  /** Distance moved per arrow-key press while the handle is focused. */
  keyboardStep?: number
}

export type UseDragTransformResult = {
  /** The transform-only layer. Attach to a wrapper, never to the content. */
  dragLayerRef: React.RefObject<HTMLDivElement | null>
  /** Callback ref for the drag handle, e.g. a titlebar. */
  setDragHandle: (node: HTMLElement | null) => void
  resetPosition: () => void
  setPosition: (next: DragPosition) => void
  position: React.RefObject<DragPosition>
}

type Bounds = { minX: number; maxX: number; minY: number; maxY: number }

const INTERACTIVE =
  'button, a, input, textarea, select, [role="button"], [data-no-drag]'

/**
 * Drag an element by a handle, as a transform-only composited layer.
 *
 * Moving never re-renders React and never repaints the content: pointer moves
 * write `transform` directly, and bounds are measured once per gesture, never
 * inside `pointermove`. Arrow keys move the element while the handle is
 * focused (Shift for bigger steps).
 */
export function useDragTransform({
  isDisabled = false,
  allowOverflow = false,
  margin = 8,
  keyboardStep = 16,
}: UseDragTransformOptions = {}): UseDragTransformResult {
  const dragLayerRef = React.useRef<HTMLDivElement | null>(null)
  const handleElRef = React.useRef<HTMLElement | null>(null)

  const position = React.useRef<DragPosition>({ x: 0, y: 0 })
  const pointerOrigin = React.useRef<DragPosition | null>(null)
  const activePointerId = React.useRef<number | null>(null)
  const bounds = React.useRef<Bounds | null>(null)

  // read through a ref so every handler below stays referentially stable
  const config = React.useRef({
    isDisabled,
    allowOverflow,
    margin,
    keyboardStep,
  })
  React.useEffect(() => {
    config.current = { isDisabled, allowOverflow, margin, keyboardStep }
  })

  const write = React.useCallback(() => {
    const layer = dragLayerRef.current
    if (!layer) return
    const { x, y } = position.current
    // translate3d keeps the layer on the compositor in every engine
    layer.style.transform =
      x === 0 && y === 0 ? "" : `translate3d(${x}px, ${y}px, 0)`
  }, [])

  const resetPosition = React.useCallback(() => {
    position.current = { x: 0, y: 0 }
    write()
  }, [write])

  const setPosition = React.useCallback(
    (next: DragPosition) => {
      position.current = { x: next.x, y: next.y }
      write()
    },
    [write]
  )

  const measureBounds = React.useCallback((): Bounds | null => {
    const layer = dragLayerRef.current
    if (!layer || config.current.allowOverflow) return null

    const rect = layer.getBoundingClientRect() // includes the current transform
    const { x, y } = position.current
    const m = config.current.margin

    return {
      minX: x + m - rect.left,
      maxX: x + window.innerWidth - m - rect.right,
      minY: y + m - rect.top,
      maxY: y + window.innerHeight - m - rect.bottom,
    }
  }, [])

  const applyClamped = React.useCallback(
    (nextX: number, nextY: number, b: Bounds | null) => {
      let x = nextX
      let y = nextY
      if (b) {
        // bigger than the viewport on an axis: leave that axis free
        if (b.minX <= b.maxX) x = Math.min(Math.max(x, b.minX), b.maxX)
        if (b.minY <= b.maxY) y = Math.min(Math.max(y, b.minY), b.maxY)
      }
      position.current = { x, y }
      write()
    },
    [write]
  )

  const onPointerMove = React.useCallback(
    (event: PointerEvent) => {
      const from = pointerOrigin.current
      if (!from) return

      const x = position.current.x + (event.clientX - from.x)
      const y = position.current.y + (event.clientY - from.y)
      pointerOrigin.current = { x: event.clientX, y: event.clientY }

      applyClamped(x, y, bounds.current) // write-only: no layout read
    },
    [applyClamped]
  )

  // stop mobile browsers from scrolling the page mid-drag
  const preventTouchScroll = React.useCallback(
    (event: TouchEvent) => event.preventDefault(),
    []
  )

  // listeners must be stable to be removable; this one forwards to the latest endDrag
  const endDragRef = React.useRef<() => void>(() => {})
  const onPointerUp = React.useCallback(() => endDragRef.current(), [])

  const endDrag = React.useCallback(() => {
    if (!pointerOrigin.current) return
    pointerOrigin.current = null
    bounds.current = null

    const handle = handleElRef.current
    const pointerId = activePointerId.current
    activePointerId.current = null

    if (handle) {
      delete handle.dataset.dragging
      if (pointerId !== null && handle.hasPointerCapture?.(pointerId)) {
        handle.releasePointerCapture(pointerId)
      }
      handle.removeEventListener("pointermove", onPointerMove)
      handle.removeEventListener("pointerup", onPointerUp)
      handle.removeEventListener("pointercancel", onPointerUp)
    }

    document.body.style.removeProperty("user-select")
    document.body.removeEventListener("touchmove", preventTouchScroll)
  }, [onPointerMove, onPointerUp, preventTouchScroll])

  React.useEffect(() => {
    endDragRef.current = endDrag
  }, [endDrag])

  const onPointerDown = React.useCallback(
    (event: PointerEvent) => {
      const handle = handleElRef.current
      if (
        config.current.isDisabled ||
        event.button !== 0 ||
        !handle ||
        !dragLayerRef.current
      )
        return
      if ((event.target as Element | null)?.closest?.(INTERACTIVE)) return

      event.preventDefault() // no text selection, no native image drag
      pointerOrigin.current = { x: event.clientX, y: event.clientY }
      activePointerId.current = event.pointerId
      bounds.current = measureBounds()

      handle.dataset.dragging = "true"
      handle.setPointerCapture?.(event.pointerId)
      handle.addEventListener("pointermove", onPointerMove)
      handle.addEventListener("pointerup", onPointerUp)
      handle.addEventListener("pointercancel", onPointerUp)

      document.body.style.setProperty("user-select", "none")
      document.body.addEventListener("touchmove", preventTouchScroll, {
        passive: false,
      })
    },
    [measureBounds, onPointerMove, onPointerUp, preventTouchScroll]
  )

  const onKeyDown = React.useCallback(
    (event: KeyboardEvent) => {
      if (config.current.isDisabled) return
      if (event.target !== handleElRef.current) return // not while typing in a child
      const step = event.shiftKey
        ? config.current.keyboardStep * 4
        : config.current.keyboardStep

      const delta =
        event.key === "ArrowLeft"
          ? { x: -step, y: 0 }
          : event.key === "ArrowRight"
            ? { x: step, y: 0 }
            : event.key === "ArrowUp"
              ? { x: 0, y: -step }
              : event.key === "ArrowDown"
                ? { x: 0, y: step }
                : null

      if (!delta) return
      event.preventDefault()
      applyClamped(
        position.current.x + delta.x,
        position.current.y + delta.y,
        measureBounds()
      )
    },
    [applyClamped, measureBounds]
  )

  const setDragHandle = React.useCallback(
    (node: HTMLElement | null) => {
      const previous = handleElRef.current
      if (previous) {
        previous.removeEventListener("pointerdown", onPointerDown)
        previous.removeEventListener("keydown", onKeyDown)
      }
      handleElRef.current = node
      if (node) {
        node.addEventListener("pointerdown", onPointerDown)
        node.addEventListener("keydown", onKeyDown)
      }
    },
    [onKeyDown, onPointerDown]
  )

  // keep the element reachable when the window is resized
  React.useEffect(() => {
    if (isDisabled) return
    const onResize = () =>
      applyClamped(position.current.x, position.current.y, measureBounds())
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [applyClamped, isDisabled, measureBounds])

  React.useEffect(() => endDrag, [endDrag])

  return { dragLayerRef, setDragHandle, resetPosition, setPosition, position }
}
