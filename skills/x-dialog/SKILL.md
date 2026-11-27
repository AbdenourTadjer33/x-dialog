---
name: x-dialog
description: Use when adding, opening or editing a dialog, modal, confirmation, prompt or picker in a React project that has `@x-dialog/react` installed or a `components/ui/x-dialog.tsx` file. Covers defineDialog, useDialogs().open, surfaces, layout slots, close guards and the rules that keep payloads and results typed.
---

# x-dialog

Dialogs are **awaited**: `const result = await open(definition, payload)`. A dialog is
one definition plus one surface component. No open/close state, no callbacks, no
central registry.

Everything app code needs is imported from the installed file — usually
`@/components/ui/x-dialog` (check `components.json` → `aliases.ui`):

```ts
import {
  Dialog, // layout slots: Dialog.Body, Dialog.Footer, Dialog.Toolbar, Dialog.TitlebarActions
  defineDialog,
  useDialogs, // { open, dismissAll, … } — call sites
  useDialog, // { id, maximized, requestClose, … } — inside a surface
  useDialogCloseGuard,
  type DialogProps,
} from "@/components/ui/x-dialog"
```

`<DialogProvider>` must be mounted once above every component that calls
`useDialogs()`. Search for it before adding another.

## Create a dialog

One file per dialog, in the app's dialogs folder (e.g. `src/dialogs/`). Export
the definition; keep the surface private.

```tsx
import { Button } from "@/components/ui/button"
import {
  Dialog,
  defineDialog,
  type DialogProps,
} from "@/components/ui/x-dialog"

type Payload = { projectName: string }
type Result = { name: string; private: boolean }

function DuplicateProjectSurface({
  payload,
  resolve,
  dismiss,
}: DialogProps<Payload, Result>) {
  const [name, setName] = React.useState(`${payload.projectName} copy`)
  return (
    <form
      className="contents"
      onSubmit={(event) => {
        event.preventDefault()
        resolve({ name, private: true })
      }}
    >
      <Dialog.Body>
        <Input
          data-autofocus
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Dialog.Body>
      <Dialog.Footer>
        <Button type="button" variant="outline" onClick={dismiss}>
          Cancel
        </Button>
        <Button type="submit">Duplicate</Button>
      </Dialog.Footer>
    </form>
  )
}

export const duplicateProjectDialog = defineDialog<Payload, Result>({
  kind: "duplicate-project",
  title: (payload) => `Duplicate ${payload.projectName}`,
  width: "md",
  component: DuplicateProjectSurface,
})
```

## Open it

```ts
const { open } = useDialogs()

const result = await open(duplicateProjectDialog, { projectName: project.name })
if (result === null) return // dismissed: Cancel, Escape, outside click, close button
await duplicate(project, result)
```

## Rules

1. **Always pass both type arguments** to `defineDialog<Payload, Result>`. Use
   `void` for "no payload" (`open(dialog)` then takes no argument) and `true`
   or `void` for "no meaningful result".
2. **`null` always means dismissed.** Never make `null` a valid `Result`; use
   a discriminated object (`{ action: "skip" }`) instead.
3. **The surface returns slots as a fragment** — `Dialog.Toolbar`,
   `Dialog.Body`, `Dialog.Footer` — never wrapped in a `<div>`. The frame is the
   flex column; a wrapper breaks scrolling and the pinned footer. For forms,
   wrap the slots in `<form className="contents">`.
4. **Settle with `resolve(value)` or `dismiss()`** from the surface. Do not keep
   your own `open` state, and do not render x-dialog surfaces inside shadcn's
   `<Dialog>`.
5. **Mark the first field `data-autofocus`** when it is not the first tabbable
   element. Otherwise focus goes to the first tabbable element of the surface.
6. **Guard unsaved work with `useDialogCloseGuard`** inside the surface. It runs
   on Escape, outside click and the close button. Read reactive values during
   render, not inside the guard via stale refs. `resolve`/`dismiss` skip it.
7. **Opening another dialog from a surface is normal** — `await open(...)`
   inside an event handler. Dialogs stack; Escape closes only the top one.
8. **Do not open dialogs during render.** Open them from event handlers or
   effects.
9. **`kind` is a stable, unique kebab-case id.** It ends up in `data-kind` and
   error reports.
10. **`Dialog.Footer` is not shadcn's `DialogFooter`.** Import `Dialog` from
    `x-dialog`, not from `@/components/ui/dialog`.

## Definition options

| Option                | Default  | Notes                                             |
| --------------------- | -------- | ------------------------------------------------- |
| `kind`                | required | Stable id.                                        |
| `title`               | required | String or `(payload) => string`. Accessible name. |
| `description`         | —        | Second titlebar line. Accessible description.     |
| `icon`                | —        | `React.ComponentType<{ className?: string }>`.    |
| `width`               | `"lg"`   | `sm` `md` `lg` `xl` `2xl` … `5xl` `full`.         |
| `height`              | `"auto"` | `auto`, `tall` (fixed working height), `full`.    |
| `closeOnEscape`       | `true`   |                                                   |
| `closeOnOutsideClick` | `true`   | `false` for large working surfaces.               |
| `maximizable`         | `true`   | Also double-click on the titlebar.                |
| `draggable`           | `true`   | Drag by the titlebar; arrow keys when focused.    |

## Patterns

**Confirm** — `defineDialog<{ title: string; description: string }, true>`;
call sites check `if (await open(confirmDialog, {...}))`.

**Picker** — `defineDialog<void, Item>` with `width: "3xl"`, `height: "tall"`,
`closeOnOutsideClick: false`, a `Dialog.Toolbar` search field and a
`Dialog.Body` list.

**Titlebar buttons** — render `<Dialog.TitlebarActions>` anywhere in the
surface; its children portal into the titlebar.

**Close everything** (e.g. on route change) — `useDialogs().dismissAll()`.

**Is any dialog open?** — `useDialogStack().length > 0` (re-renders on every
change; use sparingly).

## Testing

Query frames with `document.querySelectorAll("[data-dialog]")` or
`[data-kind="…"]`: stacked modals mark the layers beneath them `aria-hidden`,
which hides them from `getAllByRole("dialog")`. Pass `exitDuration={0}` to
`<DialogProvider>` in tests so closed dialogs unmount synchronously.
