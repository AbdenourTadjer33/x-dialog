"use client"

import * as React from "react"
import {
  DialogProvider as DialogProviderPrimitive,
  DialogTitlebarActions,
  useDialogFrame,
  type DialogFrameProps,
  type DialogHeight,
  type DialogProviderProps as DialogProviderPrimitiveProps,
  type DialogWidth,
} from "@x-dialog/react"
import { Maximize2Icon, Minimize2Icon, XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/* Sizes — edit freely, the engine only knows the token names.                */
/* -------------------------------------------------------------------------- */

const WIDTH_CLASSES: Record<DialogWidth, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  "3xl": "sm:max-w-3xl",
  "4xl": "sm:max-w-4xl",
  "5xl": "sm:max-w-5xl",
  full: "sm:max-w-none",
}

const HEIGHT_CLASSES: Record<DialogHeight, string> = {
  auto: "max-h-[calc(100dvh-2rem)]",
  tall: "h-[min(46rem,calc(100dvh-2rem))]",
  full: "h-[calc(100dvh-2rem)]",
}

/* -------------------------------------------------------------------------- */
/* Labels                                                                     */
/* -------------------------------------------------------------------------- */

type DialogLabels = {
  maximize: string
  restore: string
  close: string
}

const DEFAULT_LABELS: DialogLabels = {
  maximize: "Maximize",
  restore: "Restore",
  close: "Close",
}

const DialogLabelsContext = React.createContext<DialogLabels>(DEFAULT_LABELS)

/* -------------------------------------------------------------------------- */
/* Provider                                                                   */
/* -------------------------------------------------------------------------- */

type DialogProviderProps = Omit<DialogProviderPrimitiveProps, "frame"> & {
  /** Override the titlebar button labels, e.g. for i18n. */
  labels?: Partial<DialogLabels>
  /** Swap the frame for your own; defaults to the one in this file. */
  frame?: DialogProviderPrimitiveProps["frame"]
}

/**
 * Mount once, high in the tree. Provides `useDialogs()` and renders the
 * open dialogs.
 */
function DialogProvider({
  labels,
  frame = DialogFrame,
  ...props
}: DialogProviderProps) {
  const merged = React.useMemo(
    () => ({ ...DEFAULT_LABELS, ...labels }),
    [labels]
  )

  return (
    <DialogLabelsContext.Provider value={merged}>
      <DialogProviderPrimitive frame={frame} {...props} />
    </DialogLabelsContext.Provider>
  )
}

/* -------------------------------------------------------------------------- */
/* Frame — the window chrome around a surface, built on Radix Dialog.         */
/* -------------------------------------------------------------------------- */

function DialogFrame(props: DialogFrameProps) {
  // the callback refs are pulled out so the rest of `frame` reads as plain values
  const { setDragLayer, setDragHandle, setTitlebarSlot, setSurface, ...frame } =
    useDialogFrame(props)
  const labels = React.useContext(DialogLabelsContext)
  const Icon = frame.icon
  const stacked = props.index > 0

  return (
    <DialogPrimitive.Root open={frame.open} modal>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          data-dialog-part="overlay"
          style={{ zIndex: frame.zIndex }}
          className={cn(
            "fixed inset-0 duration-150 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
            stacked
              ? "bg-black/5"
              : "bg-black/10 supports-[backdrop-filter]:backdrop-blur-xs"
          )}
        />

        {/* Centring container. Transparent to the pointer, so a click beside
            the dialog still lands on the overlay and counts as "outside". */}
        <div
          data-dialog-part="viewport"
          style={{ zIndex: frame.zIndex }}
          className="pointer-events-none fixed inset-0 flex items-center justify-center p-4"
        >
          {/* Drag layer: owns `transform` and nothing else, so moving the
              dialog never repaints its contents. */}
          <div
            ref={setDragLayer}
            data-dialog-part="drag-layer"
            className={cn(
              "pointer-events-auto flex w-full will-change-transform",
              frame.maximized ? "h-full max-w-none" : WIDTH_CLASSES[frame.width]
            )}
          >
            <DialogPrimitive.Content
              data-dialog=""
              data-kind={frame.kind}
              data-maximized={frame.maximized || undefined}
              data-topmost={frame.isTopmost || undefined}
              // no description: opt out explicitly so Radix does not warn
              {...(frame.description ? {} : { "aria-describedby": undefined })}
              className={cn(
                "relative flex w-full flex-col overflow-hidden rounded-xl bg-popover text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/10 duration-150 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
                frame.maximized ? "h-full" : HEIGHT_CLASSES[frame.height]
              )}
              onOpenAutoFocus={(event) => {
                const target = frame.getInitialFocus()
                if (!target) return // Radix focuses the dialog itself
                event.preventDefault()
                target.focus()
              }}
              onCloseAutoFocus={(event) => {
                // Radix returns focus to a trigger; promise dialogs have none
                event.preventDefault()
                frame.restoreFocus()
              }}
              onEscapeKeyDown={(event) => {
                // closing goes through the close guard, never straight through Radix
                event.preventDefault()
                frame.handleEscapeKey()
              }}
              onPointerDownOutside={(event) => {
                event.preventDefault()
                frame.handleOutsidePress(event.detail.originalEvent.target)
              }}
              onInteractOutside={(event) => event.preventDefault()}
            >
              <header
                ref={setDragHandle}
                data-dialog-part="titlebar"
                tabIndex={frame.draggable && !frame.maximized ? 0 : undefined}
                onDoubleClick={(event) => {
                  if ((event.target as HTMLElement).closest("button")) return
                  frame.toggleMaximize()
                }}
                className={cn(
                  "flex min-h-11 shrink-0 items-center gap-2 border-b bg-muted/40 py-1.5 pr-1.5 pl-3",
                  frame.draggable &&
                    !frame.maximized &&
                    "cursor-grab touch-none select-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset data-[dragging]:cursor-grabbing"
                )}
              >
                {Icon ? (
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                ) : null}

                <div className="min-w-0 flex-1">
                  <DialogPrimitive.Title className="truncate text-sm leading-5 font-medium">
                    {frame.title}
                  </DialogPrimitive.Title>
                  {frame.description ? (
                    <DialogPrimitive.Description className="truncate text-xs text-muted-foreground">
                      {frame.description}
                    </DialogPrimitive.Description>
                  ) : null}
                </div>

                {/* Dialog.TitlebarActions portals in here */}
                <div
                  ref={setTitlebarSlot}
                  data-dialog-part="titlebar-actions"
                  className="flex shrink-0 items-center gap-0.5 empty:hidden"
                />

                {frame.maximizable ? (
                  <TitlebarButton
                    onClick={frame.toggleMaximize}
                    label={frame.maximized ? labels.restore : labels.maximize}
                  >
                    {frame.maximized ? <Minimize2Icon /> : <Maximize2Icon />}
                  </TitlebarButton>
                ) : null}

                <TitlebarButton
                  onClick={frame.requestClose}
                  label={labels.close}
                  className="hover:bg-destructive/10 hover:text-destructive"
                >
                  <XIcon />
                </TitlebarButton>
              </header>

              {/* `contents` keeps the slots as direct flex children of the frame */}
              <div ref={setSurface} className="contents">
                {frame.surface}
              </div>
            </DialogPrimitive.Content>
          </div>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function TitlebarButton({
  label,
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:pointer-events-none [&_svg]:size-3.5",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/* Layout slots — return them from a surface, as a fragment.                  */
/* -------------------------------------------------------------------------- */

/** Fixed strip under the titlebar: search, tabs, filters. */
function DialogToolbar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-dialog-part="toolbar"
      className={cn(
        "flex shrink-0 items-center gap-2 border-b px-4 py-2",
        className
      )}
      {...props}
    />
  )
}

/** The scrolling content region. */
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-dialog-part="body"
      className={cn("min-h-0 flex-1 overflow-y-auto p-4", className)}
      {...props}
    />
  )
}

/** Fixed action bar at the bottom. */
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-dialog-part="footer"
      className={cn(
        "flex shrink-0 flex-col-reverse gap-2 border-t bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

/**
 * Layout slots for a surface. Namespaced so `Dialog.Footer` never collides
 * with shadcn's `DialogFooter` from `@/components/ui/dialog`.
 */
const Dialog = {
  Toolbar: DialogToolbar,
  Body: DialogBody,
  Footer: DialogFooter,
  TitlebarActions: DialogTitlebarActions,
}

export { Dialog, DialogFrame, DialogProvider }
export type { DialogLabels, DialogProviderProps }

// The engine API, re-exported so app code imports from one place.
export {
  defineDialog,
  useDialog,
  useDialogCloseGuard,
  useDialogs,
  useDialogStack,
} from "@x-dialog/react"
export type {
  DialogCloseGuard,
  DialogDefaults,
  DialogDefinition,
  DialogPayload,
  DialogProps,
  DialogResult,
} from "@x-dialog/react"
