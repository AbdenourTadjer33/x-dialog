import type * as React from "react"

/** Width tokens. The frame maps each one to a class; the engine never styles. */
export type DialogWidth =
  "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full"

/** `auto` grows with content, `tall` is a fixed working height, `full` fills the viewport. */
export type DialogHeight = "auto" | "tall" | "full"

/**
 * Everything a surface component receives — and nothing else.
 *
 * A surface never knows how it is presented. It reads `payload` and settles the
 * caller's promise with `resolve` or `dismiss`.
 */
export type DialogProps<Payload = void, Result = void> = {
  /** The value passed as the second argument to `open()`. */
  payload: Payload
  /** Settle the caller's promise with `result`, then close. */
  resolve: (result: Result) => void
  /** Settle the caller's promise with `null`, then close. Skips the close guard. */
  dismiss: () => void
}

/**
 * Return `false` (or a promise of it) to keep the dialog open.
 *
 * Runs on every user-initiated close: Escape, outside click and the close button.
 */
export type DialogCloseGuard = () => boolean | Promise<boolean>

/** A static string, or a function of the payload. */
export type DialogText<Payload> = string | ((payload: Payload) => string)

export type DialogDefinition<Payload = void, Result = void> = {
  /** Stable identifier — used for `data-kind`, debugging and error reports. */
  kind: string
  /** Titlebar text, also the dialog's accessible name. */
  title: DialogText<Payload>
  /** Optional secondary line under the title, also the accessible description. */
  description?: DialogText<Payload>
  /** Titlebar icon, e.g. a lucide-react component. */
  icon?: React.ComponentType<{ className?: string }>
  /** Default `"lg"`. */
  width?: DialogWidth
  /** Default `"auto"`. */
  height?: DialogHeight
  /** Default `true`. */
  closeOnEscape?: boolean
  /** Default `true`. Large working surfaces usually want `false`. */
  closeOnOutsideClick?: boolean
  /** Default `true`. Also controls double-click on the titlebar. */
  maximizable?: boolean
  /** Default `true`. Drag the dialog by its titlebar. */
  draggable?: boolean
  /** The surface: a plain component that receives {@link DialogProps}. */
  component: React.ComponentType<DialogProps<Payload, Result>>
}

/**
 * A definition with its type arguments erased.
 *
 * Only the stack and the frame see this — call sites keep the precise
 * definition type, which is where payload and result inference comes from.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyDialogDefinition = DialogDefinition<any, any>

/** `open` while presented, `closing` while its exit animation plays. */
export type DialogPhase = "open" | "closing"

/** One entry of the stack. Plain data, so the stack stays inspectable. */
export type DialogInstance = {
  id: string
  definition: AnyDialogDefinition
  payload: unknown
  maximized: boolean
  phase: DialogPhase
}

/** The payload type of a definition. */
export type DialogPayload<Definition> =
  Definition extends DialogDefinition<infer Payload, infer _Result>
    ? Payload
    : never

/** The result type of a definition — what `await open(definition)` yields, minus `null`. */
export type DialogResult<Definition> =
  Definition extends DialogDefinition<infer _Payload, infer Result>
    ? Result
    : never

/** Payload is optional when the definition takes none. */
export type DialogOpenArgs<Payload> = [void] extends [Payload]
  ? [payload?: Payload]
  : [payload: Payload]
