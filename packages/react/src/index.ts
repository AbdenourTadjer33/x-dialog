// For app code
export { defineDialog } from "./define"
export { DialogProvider } from "./provider"
export { useDialogs, useDialogStack } from "./hooks/use-dialogs"
export { useDialog, useDialogCloseGuard } from "./hooks/use-dialog"
export { DialogTitlebarActions } from "./titlebar-actions"

// For frame authors
export { useDialogFrame } from "./hooks/use-dialog-frame"
export { useDragTransform } from "./hooks/use-drag-transform"
export { findInitialFocus, resolveDialogText } from "./utils"
export { BUILT_IN_DIALOG_OPTIONS, resolveDialogOptions } from "./options"

export type { DialogActions, DialogInstanceContextValue } from "./context"
export type {
  DialogCloseGuardErrorHandler,
  DialogFrameProps,
  DialogProviderProps,
} from "./provider"
export type { DialogFrameState } from "./hooks/use-dialog-frame"
export type {
  DragPosition,
  UseDragTransformOptions,
  UseDragTransformResult,
} from "./hooks/use-drag-transform"
export type {
  AnyDialogDefinition,
  DialogCloseGuard,
  DialogDefaults,
  DialogDefinition,
  DialogHeight,
  DialogInstance,
  DialogOpenArgs,
  DialogOptionName,
  DialogPayload,
  DialogPhase,
  DialogProps,
  DialogResult,
  DialogText,
  DialogWidth,
  ResolvedDialogOptions,
} from "./types"
