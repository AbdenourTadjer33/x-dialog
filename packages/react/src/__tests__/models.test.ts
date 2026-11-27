import { describe, expect, it, vi } from "vitest"

import {
  createDialogInstance,
  dialogStackReducer,
  EMPTY_DIALOG_STACK,
  topmostOpenIndex,
} from "../models/dialog-stack"
import { PendingDialogs } from "../models/pending-dialogs"
import type { DialogDefinition, DialogInstance } from "../types"

const definition: DialogDefinition = {
  kind: "demo",
  title: "Demo",
  component: () => null,
}

function instance(id: string): DialogInstance {
  return createDialogInstance(id, definition, undefined)
}

describe("dialogStackReducer", () => {
  it("appends opened dialogs so the last entry is the topmost", () => {
    const once = dialogStackReducer(EMPTY_DIALOG_STACK, {
      type: "open",
      instance: instance("a"),
    })
    const twice = dialogStackReducer(once, {
      type: "open",
      instance: instance("b"),
    })
    expect(twice.map((entry) => entry.id)).toEqual(["a", "b"])
  })

  it("marks a closed dialog as closing without removing it", () => {
    const state = dialogStackReducer([instance("a"), instance("b")], {
      type: "close",
      id: "a",
    })
    expect(state.map((entry) => entry.phase)).toEqual(["closing", "open"])
  })

  it("removes only the removed dialog", () => {
    const state = dialogStackReducer(
      [instance("a"), instance("b"), instance("c")],
      { type: "remove", id: "b" }
    )
    expect(state.map((entry) => entry.id)).toEqual(["a", "c"])
  })

  it("toggles maximize on one dialog without touching the others", () => {
    const maximized = dialogStackReducer([instance("a"), instance("b")], {
      type: "toggle-maximize",
      id: "b",
    })
    expect(maximized.map((entry) => entry.maximized)).toEqual([false, true])

    const restored = dialogStackReducer(maximized, {
      type: "toggle-maximize",
      id: "b",
    })
    expect(restored[1]!.maximized).toBe(false)
  })

  it("resets to the empty stack", () => {
    expect(dialogStackReducer([instance("a")], { type: "reset" })).toBe(
      EMPTY_DIALOG_STACK
    )
  })

  it("does not mutate the previous state", () => {
    const opened = [instance("a")]
    dialogStackReducer(opened, { type: "toggle-maximize", id: "a" })
    dialogStackReducer(opened, { type: "close", id: "a" })
    expect(opened[0]).toEqual(instance("a"))
  })

  it("starts a dialog open and un-maximized", () => {
    expect(instance("a")).toMatchObject({ phase: "open", maximized: false })
  })
})

describe("topmostOpenIndex", () => {
  it("skips closing dialogs", () => {
    const stack = dialogStackReducer([instance("a"), instance("b")], {
      type: "close",
      id: "b",
    })
    expect(topmostOpenIndex(stack)).toBe(0)
    expect(topmostOpenIndex(EMPTY_DIALOG_STACK)).toBe(-1)
  })
})

describe("PendingDialogs", () => {
  it("hands out sequential ids per instance", () => {
    const pending = new PendingDialogs()
    expect([pending.nextId(), pending.nextId()]).toEqual([
      "dialog-1",
      "dialog-2",
    ])
    // a second provider counts from scratch
    expect(new PendingDialogs().nextId()).toBe("dialog-1")
  })

  it("settles a pending dialog once and forgets it", () => {
    const pending = new PendingDialogs()
    const settler = vi.fn()
    pending.add("dialog-1", settler, "demo")

    expect(pending.kindOf("dialog-1")).toBe("demo")
    expect(pending.settle("dialog-1", "result")).toBe(true)
    expect(settler).toHaveBeenCalledExactlyOnceWith("result")
    expect(pending.has("dialog-1")).toBe(false)
    expect(pending.settle("dialog-1", "again")).toBe(false)
  })

  it("stores and clears close guards, and drops them on settle", () => {
    const pending = new PendingDialogs()
    const guard = () => true

    pending.add("dialog-1", vi.fn())
    pending.setGuard("dialog-1", guard)
    expect(pending.getGuard("dialog-1")).toBe(guard)

    pending.setGuard("dialog-1", null)
    expect(pending.getGuard("dialog-1")).toBeUndefined()

    pending.setGuard("dialog-1", guard)
    pending.settle("dialog-1", null)
    expect(pending.getGuard("dialog-1")).toBeUndefined()
  })

  it("dedupes concurrent close requests", async () => {
    const pending = new PendingDialogs()
    const request = vi.fn(async () => true)

    const first = pending.dedupeClose("dialog-1", request)
    const second = pending.dedupeClose("dialog-1", request)
    expect(first).toBe(second)
    await first

    // once settled, a new request runs again
    await pending.dedupeClose("dialog-1", request)
    expect(request).toHaveBeenCalledTimes(2)
  })

  it("settles everything with null on teardown", () => {
    const pending = new PendingDialogs()
    const first = vi.fn()
    const second = vi.fn()
    pending.add("dialog-1", first)
    pending.add("dialog-2", second)

    expect(pending.ids()).toEqual(["dialog-1", "dialog-2"])
    pending.settleAll()

    expect(first).toHaveBeenCalledExactlyOnceWith(null)
    expect(second).toHaveBeenCalledExactlyOnceWith(null)
    expect(pending.ids()).toEqual([])
  })
})
