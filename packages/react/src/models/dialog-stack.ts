import type {
  AnyDialogDefinition,
  DialogDefinition,
  DialogInstance,
} from "../types"

export type DialogStackAction =
  | { type: "open"; instance: DialogInstance }
  | { type: "close"; id: string }
  | { type: "remove"; id: string }
  | { type: "toggle-maximize"; id: string }
  | { type: "reset" }

export const EMPTY_DIALOG_STACK: DialogInstance[] = []

/**
 * Pure. The stack is bottom-most first; the last entry is the topmost dialog.
 *
 * `close` only marks the entry so the frame can play its exit animation;
 * `remove` takes it out of the stack.
 */
export function dialogStackReducer(
  state: DialogInstance[],
  action: DialogStackAction
): DialogInstance[] {
  switch (action.type) {
    case "open":
      return [...state, action.instance]
    case "close":
      return state.map((instance) =>
        instance.id === action.id && instance.phase !== "closing"
          ? { ...instance, phase: "closing" }
          : instance
      )
    case "remove":
      return state.filter((instance) => instance.id !== action.id)
    case "toggle-maximize":
      return state.map((instance) =>
        instance.id === action.id
          ? { ...instance, maximized: !instance.maximized }
          : instance
      )
    case "reset":
      return EMPTY_DIALOG_STACK
    default:
      return state
  }
}

export function createDialogInstance<Payload, Result>(
  id: string,
  definition: DialogDefinition<Payload, Result>,
  payload: unknown
): DialogInstance {
  return {
    id,
    // the stack is type-erased on purpose; call sites keep the precise type
    definition: definition as unknown as AnyDialogDefinition,
    payload,
    maximized: false,
    phase: "open",
  }
}

/** Index of the topmost dialog that is still open, or -1. */
export function topmostOpenIndex(stack: readonly DialogInstance[]): number {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    if (stack[index]?.phase === "open") return index
  }
  return -1
}
