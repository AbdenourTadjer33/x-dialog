import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import * as base from "@/registry/base/x-dialog"
import * as radix from "@/registry/radix/x-dialog"

/**
 * The same contract, run against both registry frames. The engine has its
 * own exhaustive tests; these check the wiring to each primitive.
 */
describe.each([
  ["radix", radix],
  ["base", base],
] as const)("%s frame", (_name, ui) => {
  const {
    Dialog,
    DialogProvider,
    defineDialog,
    useDialogs,
    useDialogCloseGuard,
  } = ui

  const askDialog = defineDialog<{ question: string }, string>({
    kind: "ask",
    title: (payload) => payload.question,
    description: "Answer below",
    component: ({ payload, resolve, dismiss }) => (
      <>
        <Dialog.Body>
          <input aria-label="Answer" defaultValue={payload.question} />
        </Dialog.Body>
        <Dialog.Footer>
          <button type="button" onClick={dismiss}>
            Cancel
          </button>
          <button type="button" onClick={() => resolve("yes")}>
            Answer yes
          </button>
        </Dialog.Footer>
      </>
    ),
  })

  const blockedDialog = defineDialog({
    kind: "blocked",
    title: "Blocked",
    component: function BlockedSurface() {
      useDialogCloseGuard(() => false)
      return <Dialog.Body>cannot leave</Dialog.Body>
    },
  })

  function setup() {
    let actions!: ReturnType<typeof useDialogs>
    function Grab() {
      actions = useDialogs()
      return <button type="button">opener</button>
    }
    render(
      <DialogProvider exitDuration={0}>
        <Grab />
      </DialogProvider>
    )
    return () => actions
  }

  function track<T>(promise: Promise<T>) {
    const state: { done: boolean; value?: T } = { done: false }
    void promise.then((value) => {
      state.done = true
      state.value = value
    })
    return state
  }

  it("renders an accessible dialog and resolves with the surface value", async () => {
    const actions = setup()
    let result!: { done: boolean; value?: string | null }
    act(() => {
      result = track(actions().open(askDialog, { question: "Ship it?" }))
    })

    const dialog = await screen.findByRole("dialog", { name: "Ship it?" })
    expect(dialog.getAttribute("data-kind")).toBe("ask")
    // the description is wired to the dialog
    const describedBy = dialog.getAttribute("aria-describedby")
    expect(
      describedBy && document.getElementById(describedBy)?.textContent
    ).toBe("Answer below")

    fireEvent.click(screen.getByRole("button", { name: "Answer yes" }))
    await waitFor(() => expect(result.value).toBe("yes"))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })

  it("settles with null from the titlebar close button", async () => {
    const actions = setup()
    let result!: { done: boolean; value?: string | null }
    act(() => {
      result = track(actions().open(askDialog, { question: "Close me" }))
    })
    await screen.findByRole("dialog")

    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    await waitFor(() => expect(result.done).toBe(true))
    expect(result.value).toBeNull()
  })

  it("maximizes and restores from the titlebar", async () => {
    const actions = setup()
    act(() => {
      void actions().open(askDialog, { question: "Big" })
    })
    const dialog = await screen.findByRole("dialog")

    fireEvent.click(screen.getByRole("button", { name: "Maximize" }))
    await waitFor(() =>
      expect(dialog.getAttribute("data-maximized")).toBe("true")
    )
    fireEvent.click(screen.getByRole("button", { name: "Restore" }))
    await waitFor(() =>
      expect(dialog.hasAttribute("data-maximized")).toBe(false)
    )
  })

  it("keeps a guarded dialog open on the close button", async () => {
    const actions = setup()
    let result!: { done: boolean }
    act(() => {
      result = track(actions().open(blockedDialog))
    })
    await screen.findByText("cannot leave")

    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    await act(async () => {})
    expect(result.done).toBe(false)
    expect(screen.getByText("cannot leave")).toBeTruthy()
  })

  it("closes only the topmost dialog on Escape", async () => {
    const actions = setup()
    let bottom!: { done: boolean }
    let top!: { done: boolean; value?: string | null }
    act(() => {
      bottom = track(actions().open(askDialog, { question: "Bottom" }))
    })
    await screen.findByRole("dialog", { name: "Bottom" })
    act(() => {
      top = track(actions().open(askDialog, { question: "Top" }))
    })
    const topDialog = await screen.findByRole("dialog", { name: "Top" })

    fireEvent.keyDown(topDialog, { key: "Escape" })
    await waitFor(() => expect(top.done).toBe(true))
    expect(top.value).toBeNull()
    expect(bottom.done).toBe(false)
  })

  it("uses custom labels", async () => {
    let actions!: ReturnType<typeof useDialogs>
    function Grab() {
      actions = useDialogs()
      return null
    }
    render(
      <DialogProvider exitDuration={0} labels={{ close: "Fermer" }}>
        <Grab />
      </DialogProvider>
    )
    act(() => {
      void actions.open(askDialog, { question: "Bonjour" })
    })
    expect(await screen.findByRole("button", { name: "Fermer" })).toBeTruthy()
  })

  it("applies provider defaults to the titlebar", async () => {
    let actions!: ReturnType<typeof useDialogs>
    function Grab() {
      actions = useDialogs()
      return null
    }
    render(
      <DialogProvider
        exitDuration={0}
        defaults={{ maximizable: false, draggable: false }}
      >
        <Grab />
      </DialogProvider>
    )
    act(() => {
      void actions.open(askDialog, { question: "Locked" })
    })
    const dialog = await screen.findByRole("dialog", { name: "Locked" })

    expect(screen.queryByRole("button", { name: "Maximize" })).toBeNull()
    // not draggable: the titlebar is no longer a keyboard drag handle
    const titlebar = dialog.querySelector('[data-dialog-part="titlebar"]')
    expect(titlebar?.hasAttribute("tabindex")).toBe(false)
  })
})
