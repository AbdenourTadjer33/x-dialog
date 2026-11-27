import type { DialogText } from "./types"

/** Resolve a title or description that may be a function of the payload. */
export function resolveDialogText(
  value: DialogText<never> | undefined,
  payload: unknown
): string | undefined {
  if (typeof value === "function") {
    return (value as (input: unknown) => string)(payload)
  }
  return value
}

const TABBABLE = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(",")

/**
 * The element a dialog should focus when it opens.
 *
 * An element marked `data-autofocus` wins; otherwise the first tabbable
 * element inside `container`. Returns `null` when there is none, so the
 * frame can fall back to focusing the dialog itself.
 */
export function findInitialFocus(
  container: HTMLElement | null
): HTMLElement | null {
  if (!container) return null

  const explicit = container.querySelector<HTMLElement>("[data-autofocus]")
  if (explicit) return explicit

  for (const element of container.querySelectorAll<HTMLElement>(TABBABLE)) {
    if (!element.closest("[hidden], [inert]")) return element
  }
  return null
}

/**
 * Outside presses that must not close a dialog: toasts (which live in their
 * own portal) and anything the app marks with `data-dialog-ignore-outside`.
 */
const IGNORED_OUTSIDE = [
  "[data-dialog-ignore-outside]",
  "[data-sonner-toaster]",
].join(",")

export function isIgnoredOutsideTarget(
  target: EventTarget | null | undefined
): boolean {
  if (!target || typeof (target as Element).closest !== "function") {
    return false
  }
  return (target as Element).closest(IGNORED_OUTSIDE) !== null
}
