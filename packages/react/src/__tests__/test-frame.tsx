import type * as React from "react"

import { useDialogFrame } from "../hooks/use-dialog-frame"
import type { DialogFrameProps } from "../provider"

/**
 * The smallest possible frame: plain markup over `useDialogFrame`, no
 * primitive library. Engine tests run against it so they test the engine,
 * not Radix or Base UI.
 */
export function TestFrame(props: DialogFrameProps): React.JSX.Element {
  // the callback refs are pulled out so the rest of `frame` reads as plain values
  const { setDragLayer, setDragHandle, setTitlebarSlot, setSurface, ...frame } =
    useDialogFrame(props)

  return (
    <div
      role="dialog"
      aria-label={frame.title}
      data-dialog=""
      data-kind={frame.kind}
      data-state={frame.open ? "open" : "closing"}
      data-topmost={frame.isTopmost || undefined}
      data-maximized={frame.maximized || undefined}
      data-width={frame.width}
      style={{ zIndex: frame.zIndex }}
      onKeyDown={(event) => {
        if (event.key === "Escape") frame.handleEscapeKey()
      }}
    >
      <div
        data-testid="outside"
        onPointerDown={(event) => frame.handleOutsidePress(event.target)}
      />
      <div ref={setDragLayer}>
        <header ref={setDragHandle} data-dialog-part="titlebar">
          <h2>{frame.title}</h2>
          {frame.description ? <p>{frame.description}</p> : null}
          <div ref={setTitlebarSlot} />
          {frame.maximizable ? (
            <button type="button" onClick={frame.toggleMaximize}>
              {frame.maximized ? "Restore" : "Maximize"}
            </button>
          ) : null}
          <button type="button" onClick={frame.requestClose}>
            Close
          </button>
        </header>
        <div ref={setSurface}>{frame.surface}</div>
      </div>
    </div>
  )
}
