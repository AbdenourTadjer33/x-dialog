# @x-dialog/react

## 0.2.0

### Minor Changes

- [`1f4eccf`](https://github.com/AbdenourTadjer33/x-dialog/commit/1f4eccf5c2ec425f7f3fb1a69424fb066a3f069a) Thanks [@AbdenourTadjer33](https://github.com/AbdenourTadjer33)! - Add `defaults` to `DialogProvider`: set `width`, `height`, `closeOnEscape`, `closeOnOutsideClick`, `maximizable` and `draggable` once for the whole app — e.g. `<DialogProvider defaults={{ maximizable: false, draggable: false }}>`. A definition that sets an option still wins, so one dialog can opt back in. Also exports the `DialogDefaults` type and `resolveDialogOptions()` for custom frames.

## 0.1.0

### Minor Changes

- [`c1c16ae`](https://github.com/AbdenourTadjer33/x-dialog/commit/c1c16aeb18795c97c6916b004d49aeb44577c66f) Thanks [@AbdenourTadjer33](https://github.com/AbdenourTadjer33)! - First public release: promise-based, typed dialogs with stacking, close guards, drag and maximize, plus shadcn registry frames for Radix and Base UI.
