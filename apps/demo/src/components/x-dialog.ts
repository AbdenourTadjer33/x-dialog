/**
 * In an app this is `@/components/ui/x-dialog` — the file `shadcn add`
 * installs. The demo ships both frames, so surfaces import the shared API
 * from here and the app picks the provider (Radix or Base UI) at runtime.
 */
export {
  Dialog,
  defineDialog,
  useDialog,
  useDialogCloseGuard,
  useDialogs,
  useDialogStack,
} from "@/registry/radix/x-dialog"
export type { DialogProps } from "@/registry/radix/x-dialog"
