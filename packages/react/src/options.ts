import type {
  AnyDialogDefinition,
  DialogDefaults,
  ResolvedDialogOptions,
} from "./types"

/** What a dialog gets when neither its definition nor the provider says otherwise. */
export const BUILT_IN_DIALOG_OPTIONS: ResolvedDialogOptions = {
  width: "lg",
  height: "auto",
  closeOnEscape: true,
  closeOnOutsideClick: true,
  maximizable: true,
  draggable: true,
}

/**
 * Pure. For each option: the definition wins, then the provider's defaults,
 * then the built-ins. `undefined` means "not set" at every level.
 */
export function resolveDialogOptions(
  definition: Pick<AnyDialogDefinition, keyof DialogDefaults>,
  defaults: DialogDefaults = {}
): ResolvedDialogOptions {
  const builtIn = BUILT_IN_DIALOG_OPTIONS
  return {
    width: definition.width ?? defaults.width ?? builtIn.width,
    height: definition.height ?? defaults.height ?? builtIn.height,
    closeOnEscape:
      definition.closeOnEscape ??
      defaults.closeOnEscape ??
      builtIn.closeOnEscape,
    closeOnOutsideClick:
      definition.closeOnOutsideClick ??
      defaults.closeOnOutsideClick ??
      builtIn.closeOnOutsideClick,
    maximizable:
      definition.maximizable ?? defaults.maximizable ?? builtIn.maximizable,
    draggable: definition.draggable ?? defaults.draggable ?? builtIn.draggable,
  }
}
