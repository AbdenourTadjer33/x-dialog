---
"@x-dialog/react": minor
---

Add `defaults` to `DialogProvider`: set `width`, `height`, `closeOnEscape`, `closeOnOutsideClick`, `maximizable` and `draggable` once for the whole app — e.g. `<DialogProvider defaults={{ maximizable: false, draggable: false }}>`. A definition that sets an option still wins, so one dialog can opt back in. Also exports the `DialogDefaults` type and `resolveDialogOptions()` for custom frames.
