# API reference

Everything below is exported from `@/components/ui/x-dialog` (the file the registry
installs). The frame-authoring APIs at the end are exported from `@x-dialog/react`.

- [`defineDialog`](#definedialog)
- [`DialogProvider`](#dialogprovider)
- [`useDialogs`](#usedialogs)
- [Surfaces: `DialogProps`](#surfaces-dialogprops)
- [`useDialog`](#usedialog)
- [`useDialogCloseGuard`](#usedialogcloseguard)
- [`useDialogStack`](#usedialogstack)
- [Layout slots](#layout-slots)
- [Type helpers](#type-helpers)
- [Focus](#focus)
- [Outside clicks](#outside-clicks)
- [DOM attributes](#dom-attributes)
- [Custom frames](#custom-frames)

---

## `defineDialog`

```ts
function defineDialog<Payload = void, Result = void>(
  definition: DialogDefinition<Payload, Result>
): DialogDefinition<Payload, Result>
```

Declares a dialog. The returned object is the handle you pass to `open()`; there is
nothing to register. Defaults below are the built-ins; an app can change them with
[provider defaults](#provider-defaults). Always pass both type arguments — they drive inference at every call
site.

| Option                | Type                                                      | Default  | Notes                                                                                   |
| --------------------- | --------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| `kind`                | `string`                                                  | required | Stable, unique id. Appears as `data-kind` and in error reports.                         |
| `title`               | `string \| (payload) => string`                           | required | Titlebar text and the dialog's accessible name.                                         |
| `description`         | `string \| (payload) => string`                           | —        | Second titlebar line and the accessible description.                                    |
| `icon`                | `ComponentType<{ className?: string }>`                   | —        | Rendered at the start of the titlebar, e.g. a lucide icon.                              |
| `width`               | `"sm" \| "md" \| "lg" \| "xl" \| "2xl" … "5xl" \| "full"` | `"lg"`   | Maps to `sm:max-w-*` in the frame. Below the `sm` breakpoint dialogs are full-width.    |
| `height`              | `"auto" \| "tall" \| "full"`                              | `"auto"` | `auto` grows with content, `tall` is a fixed working height, `full` fills the viewport. |
| `closeOnEscape`       | `boolean`                                                 | `true`   |                                                                                         |
| `closeOnOutsideClick` | `boolean`                                                 | `true`   | Set `false` for large working surfaces where a stray click would lose work.             |
| `maximizable`         | `boolean`                                                 | `true`   | Shows the maximize button and enables double-click on the titlebar.                     |
| `draggable`           | `boolean`                                                 | `true`   | Drag by the titlebar; arrow keys move it while the titlebar is focused (Shift for ×4).  |
| `component`           | `ComponentType<DialogProps<Payload, Result>>`             | required | The surface.                                                                            |

**Payload rules.** With `Payload = void`, `open(dialog)` takes no second argument.
Otherwise the payload is required and checked.

**Result rules.** `open()` resolves with `Result | null`, where `null` always means
"dismissed". Do not make `null` a meaningful `Result` — return a discriminated object
instead (`{ action: "skip" }`).

---

## `DialogProvider`

```tsx
<DialogProvider
  defaults={{ maximizable: false, draggable: false }}
  labels={{ maximize: "Agrandir", restore: "Restaurer", close: "Fermer" }}
  exitDuration={200}
  baseZIndex={50}
  onCloseGuardError={(error, { id, kind }) => report(error, { kind })}
>
  {children}
</DialogProvider>
```

Mount once, high in the tree but inside the providers your dialogs need (router, query
client, theme, i18n) — dialogs render inside your React tree and share them.

| Prop                | Default          | Notes                                                                                                              |
| ------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| `defaults`          | built-ins        | App-wide values for definition options — see [Provider defaults](#provider-defaults).                              |
| `labels`            | English          | Titlebar button labels.                                                                                            |
| `exitDuration`      | `200`            | ms a closed dialog stays mounted for its exit animation. The promise settles immediately anyway. Use `0` in tests. |
| `baseZIndex`        | `50`             | z-index of the bottom dialog; each stacked dialog adds 10.                                                         |
| `onCloseGuardError` | `console.error`  | Called when a close guard throws. The dialog stays open.                                                           |
| `frame`             | the file's frame | Replace the frame entirely — see [Custom frames](#custom-frames).                                                  |

Unmounting the provider settles every open dialog with `null`.

### Provider defaults

Some apps never want dragging or maximizing; others never close on outside click.
Set those once on the provider instead of in every definition:

```tsx
<DialogProvider defaults={{ maximizable: false, draggable: false }}>
```

`defaults` accepts the options that make sense app-wide — `width`, `height`,
`closeOnEscape`, `closeOnOutsideClick`, `maximizable`, `draggable` — typed as
`DialogDefaults`. Per-dialog fields (`kind`, `title`, `component`, …) are rejected.

Each option is resolved in this order, first match wins:

1. **The definition**, when it sets the option — even to the built-in value. One
   dialog can opt back in to what the app turned off: `maximizable: true`.
2. **The provider's `defaults`.**
3. **The built-ins**: `width: "lg"`, `height: "auto"`, everything else `true`.

`undefined` counts as "not set" at every level. Frame authors get the resolved values
from `useDialogFrame`, or can call `resolveDialogOptions(definition, defaults)` directly.

---

## `useDialogs`

```ts
const { open, dismissAll, resolve, dismiss, requestClose, toggleMaximize } =
  useDialogs()
```

The returned object **never changes identity** — it is safe in dependency arrays and does
not re-render the caller when dialogs open or close.

| Member                       | Returns                   | Notes                                                                  |
| ---------------------------- | ------------------------- | ---------------------------------------------------------------------- |
| `open(definition, payload?)` | `Promise<Result \| null>` | Opens a dialog on top of the stack.                                    |
| `dismissAll()`               | `void`                    | Settles every open dialog with `null`, topmost first, skipping guards. |
| `resolve(id, result)`        | `boolean`                 | Settle one dialog by id. `false` if it was not open.                   |
| `dismiss(id)`                | `boolean`                 | Settle one dialog with `null`, skipping its guard.                     |
| `requestClose(id)`           | `Promise<boolean>`        | Close through the guard. Resolves to whether it closed.                |
| `toggleMaximize(id)`         | `void`                    |                                                                        |
| `registerCloseGuard(id, fn)` | `void`                    | Low-level; prefer `useDialogCloseGuard`.                               |

`useDialogs()` throws when there is no `<DialogProvider>` above it.

---

## Surfaces: `DialogProps`

```ts
type DialogProps<Payload = void, Result = void> = {
  payload: Payload
  resolve: (result: Result) => void
  dismiss: () => void
}
```

A surface is a plain component that receives exactly these props. It returns
[layout slots](#layout-slots) as a fragment. `resolve` and `dismiss` are deliberate
actions, so they **skip the close guard**.

---

## `useDialog`

Inside a surface, controls for the dialog it is rendered in:

```ts
const {
  id,
  kind,
  maximized,
  maximizable,
  isTopmost,
  toggleMaximize,
  requestClose,
} = useDialog()
```

`requestClose()` closes through the guard, like the titlebar close button.

---

## `useDialogCloseGuard`

```ts
useDialogCloseGuard(guard: () => boolean | Promise<boolean>): void
```

Return `false` (or a promise of it) to keep the dialog open. It runs on Escape, outside
click, the titlebar close button and `requestClose()` — every user-initiated close.

- The latest closure always runs; read reactive values during render.
- It may be async and may `await open(...)` another dialog.
- While it is deciding, further close requests reuse the same run — pressing Escape
  twice does not ask twice.
- If it throws, the dialog stays open and `onCloseGuardError` is called.

---

## `useDialogStack`

```ts
const stack: readonly DialogInstance[] = useDialogStack()
```

The open stack, bottom-most first. Each entry is plain data:
`{ id, definition, payload, maximized, phase: "open" | "closing" }`. It re-renders on
every change, so use it for things like "is any dialog open", not for opening dialogs.

---

## Layout slots

Return them from a surface **as a fragment**. The frame is a flex column; wrapping the
slots in an element breaks the scrolling body and the pinned footer. For forms, wrap them
in `<form className="contents">`.

| Slot                     | Element                                                        |
| ------------------------ | -------------------------------------------------------------- |
| `Dialog.Toolbar`         | Fixed strip under the titlebar — search, tabs, filters.        |
| `Dialog.Body`            | The scrolling region.                                          |
| `Dialog.Footer`          | Fixed action bar. Stacks vertically on mobile.                 |
| `Dialog.TitlebarActions` | Portals its children into the titlebar, before maximize/close. |

All accept `className` and the usual `div` props (except `TitlebarActions`).

---

## Type helpers

```ts
type Name = DialogResult<typeof renameDialog> // string
type Args = DialogPayload<typeof renameDialog> // { name: string }
```

Also exported: `DialogDefinition`, `DialogDefaults`, `DialogProps`, `DialogCloseGuard`. From
`@x-dialog/react`: `DialogInstance`, `DialogWidth`, `DialogHeight`, `DialogActions`,
`DialogOpenArgs`.

---

## Focus

- **On open**, focus goes to the element marked `data-autofocus` inside the surface,
  otherwise to its first tabbable element, otherwise to the dialog itself.
- **On close**, focus returns to whatever had focus when the dialog opened — the button
  that opened it, or a field in the dialog underneath.

---

## Outside clicks

An outside click closes only the topmost dialog, through its guard, and only when
`closeOnOutsideClick` is on. Clicks inside a sonner toaster, or inside any element with
`data-dialog-ignore-outside`, are ignored:

```tsx
<aside data-dialog-ignore-outside>…</aside>
```

---

## DOM attributes

| Attribute                        | On                                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------- |
| `data-dialog`                    | The dialog element (Radix `Content` / Base UI `Popup`).                                           |
| `data-kind="…"`                  | Same element — the definition's `kind`.                                                           |
| `data-maximized`, `data-topmost` | Same element, when true.                                                                          |
| `data-dialog-part="…"`           | `overlay`, `viewport`, `drag-layer`, `titlebar`, `titlebar-actions`, `toolbar`, `body`, `footer`. |
| `data-dragging`                  | The titlebar, during a drag.                                                                      |

They use `data-dialog*` rather than `data-slot` so they never collide with shadcn's
`data-slot="dialog-*"`.

---

## Custom frames

A frame renders one dialog. The registry files contain one for Radix and one for Base UI;
to render dialogs differently, write your own and pass it to the provider:

```tsx
import { useDialogFrame, type DialogFrameProps } from "@x-dialog/react"

function SheetFrame(props: DialogFrameProps) {
  // Pull the callback refs out: with the React Compiler lint, an object whose
  // members are passed to `ref` is treated as a ref, and every read is flagged.
  const { setDragLayer, setDragHandle, setTitlebarSlot, setSurface, ...frame } =
    useDialogFrame(props)

  // Wire:
  //   frame.open                       → the primitive's `open` (keep it controlled)
  //   frame.handleEscapeKey()          → on Escape (applies closeOnEscape + topmost-only)
  //   frame.handleOutsidePress(target) → on outside press
  //   frame.requestClose()             → your close button (runs the guard)
  //   frame.getInitialFocus()          → initial focus target
  //   frame.restoreFocus()             → when the primitive returns focus on close
  //   setDragLayer / setDragHandle / setTitlebarSlot / setSurface → `ref` props
  // Render frame.title, frame.description and frame.surface.
  return …
}

<DialogProvider frame={SheetFrame}>…</DialogProvider>
```

`useDialogFrame` resolves the definition's options, owns drag and maximize geometry, and
renders the surface inside its instance context. Your frame adds markup and the
primitive. Keep the primitive **controlled** by `frame.open` and route every close
through the `handle*` callbacks — never let the primitive close itself, or the close
guard is bypassed.
