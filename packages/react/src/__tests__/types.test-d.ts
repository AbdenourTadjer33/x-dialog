import { describe, expectTypeOf, it } from "vitest"

import type { DialogActions } from "../context"
import { defineDialog } from "../define"
import type {
  DialogDefaults,
  DialogPayload,
  DialogProps,
  DialogResult,
} from "../types"

declare const open: DialogActions["open"]

const renameDialog = defineDialog<{ name: string }, string>({
  kind: "rename",
  title: (payload) => `Rename ${payload.name}`,
  component: (_props: DialogProps<{ name: string }, string>) => null,
})

const confirmDialog = defineDialog<void, boolean>({
  kind: "confirm",
  title: "Are you sure?",
  component: () => null,
})

const optionalPayloadDialog = defineDialog<
  { hint?: string } | undefined,
  number
>({
  kind: "optional",
  title: "Optional",
  component: () => null,
})

describe("open()", () => {
  it("infers the result type, plus null for dismissal", () => {
    expectTypeOf(open(renameDialog, { name: "a.txt" })).toEqualTypeOf<
      Promise<string | null>
    >()
    expectTypeOf(open(confirmDialog)).toEqualTypeOf<Promise<boolean | null>>()
  })

  it("requires the payload when the definition has one", () => {
    // @ts-expect-error — missing payload
    void open(renameDialog)
    // @ts-expect-error — wrong payload shape
    void open(renameDialog, { title: "a.txt" })
  })

  it("makes the payload optional when it is void", () => {
    void open(confirmDialog)
    void open(confirmDialog, undefined)
  })

  it("requires an argument for payloads that are merely undefined-able", () => {
    void open(optionalPayloadDialog, undefined)
    void open(optionalPayloadDialog, { hint: "x" })
  })
})

describe("definitions", () => {
  it("types the title function's payload", () => {
    defineDialog<{ count: number }, void>({
      kind: "count",
      title: (payload) => {
        expectTypeOf(payload).toEqualTypeOf<{ count: number }>()
        return String(payload.count)
      },
      component: () => null,
    })
  })

  it("rejects a surface whose props do not match", () => {
    defineDialog<{ name: string }, string>({
      kind: "mismatch",
      title: "Mismatch",
      // @ts-expect-error — surface resolves a number, definition says string
      component: (_props: DialogProps<{ name: string }, number>) => null,
    })
  })

  it("extracts payload and result types", () => {
    expectTypeOf<DialogPayload<typeof renameDialog>>().toEqualTypeOf<{
      name: string
    }>()
    expectTypeOf<DialogResult<typeof renameDialog>>().toEqualTypeOf<string>()
    expectTypeOf<DialogResult<typeof confirmDialog>>().toEqualTypeOf<boolean>()
  })
})

describe("surface props", () => {
  it("types resolve with the result and dismiss with nothing", () => {
    expectTypeOf<DialogProps<{ id: number }, string>>().toEqualTypeOf<{
      payload: { id: number }
      resolve: (result: string) => void
      dismiss: () => void
    }>()
  })

  it("allows resolve() with no argument for void results", () => {
    const props = {} as DialogProps<void, void>
    props.resolve()
  })
})

describe("provider defaults", () => {
  it("accepts the shared options", () => {
    const defaults: DialogDefaults = {
      width: "md",
      height: "tall",
      closeOnEscape: true,
      closeOnOutsideClick: false,
      maximizable: false,
      draggable: false,
    }
    void defaults
  })

  it("rejects options that only make sense per dialog", () => {
    // @ts-expect-error — a title belongs to one dialog
    const withTitle: DialogDefaults = { title: "Hi" }
    // @ts-expect-error — so does the kind
    const withKind: DialogDefaults = { kind: "x" }
    // @ts-expect-error — and the width must be a known token
    const badWidth: DialogDefaults = { width: "huge" }
    void [withTitle, withKind, badWidth]
  })
})
