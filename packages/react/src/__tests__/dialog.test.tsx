import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import * as React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { DialogActions } from "../context"
import { defineDialog } from "../define"
import { useDialog, useDialogCloseGuard } from "../hooks/use-dialog"
import { useDialogs, useDialogStack } from "../hooks/use-dialogs"
import { DialogProvider } from "../provider"
import type { DialogProviderProps } from "../provider"
import { DialogTitlebarActions } from "../titlebar-actions"
import type { DialogProps } from "../types"
import { TestFrame } from "./test-frame"

afterEach(cleanup)

/* -------------------------------------------------------------------------- */
/* fixtures                                                                   */
/* -------------------------------------------------------------------------- */

function EchoSurface({
  payload,
  resolve,
  dismiss,
}: DialogProps<{ label: string }, string>) {
  return (
    <div>
      <p>{payload.label}</p>
      <button
        type="button"
        onClick={() => resolve(`resolved:${payload.label}`)}
      >
        resolve
      </button>
      <button type="button" onClick={dismiss}>
        dismiss
      </button>
    </div>
  )
}

const echoDialog = defineDialog<{ label: string }, string>({
  kind: "echo",
  title: (payload) => `Echo ${payload.label}`,
  description: "An echo",
  component: EchoSurface,
})

function GuardedSurface({
  payload,
  resolve,
}: DialogProps<{ allow: () => boolean | Promise<boolean> }, string>) {
  const { id } = useDialog()
  useDialogCloseGuard(payload.allow)

  return (
    <div>
      <span data-testid="instance-id">{id}</span>
      <button type="button" onClick={() => resolve("saved")}>
        save
      </button>
    </div>
  )
}

const guardedDialog = defineDialog<
  { allow: () => boolean | Promise<boolean> },
  string
>({
  kind: "guarded",
  title: "Guarded",
  component: GuardedSurface,
})

const titlebarActionsDialog = defineDialog({
  kind: "titlebar-actions",
  title: "Titlebar actions",
  component: () => (
    <>
      <DialogTitlebarActions>
        <button type="button">custom action</button>
      </DialogTitlebarActions>
      <p>body</p>
    </>
  ),
})

const lockedDialog = defineDialog({
  kind: "locked",
  title: "Locked",
  closeOnEscape: false,
  closeOnOutsideClick: false,
  maximizable: false,
  component: () => <p>locked body</p>,
})

/** Exposes the actions object to the test. */
function harness(
  props: Partial<DialogProviderProps> = {},
  wrap: (node: React.ReactNode) => React.ReactNode = (node) => node
) {
  const captured: { actions?: DialogActions; identities: DialogActions[] } = {
    identities: [],
  }

  function Probe() {
    const actions = useDialogs()
    React.useEffect(() => {
      captured.actions = actions
      captured.identities.push(actions)
    })
    return null
  }

  const view = render(
    wrap(
      <DialogProvider frame={TestFrame} exitDuration={0} {...props}>
        <Probe />
      </DialogProvider>
    )
  )

  return {
    ...view,
    get actions(): DialogActions {
      if (!captured.actions) throw new Error("provider not mounted")
      return captured.actions
    },
    identities: captured.identities,
  }
}

/**
 * Query frames by attribute: a real modal marks the layers beneath it
 * `aria-hidden`, which hides them from `getAllByRole("dialog")`.
 */
function frames(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-dialog]"))
}

function openAndTrack<T>(promise: () => Promise<T>) {
  const state: { settled: boolean; value?: T } = { settled: false }
  act(() => {
    void promise().then((value) => {
      state.settled = true
      state.value = value
    })
  })
  return state
}

/* -------------------------------------------------------------------------- */
/* tests                                                                      */
/* -------------------------------------------------------------------------- */

describe("opening and settling", () => {
  it("resolves the caller's promise with the surface result", async () => {
    const h = harness()
    const result = openAndTrack(() =>
      h.actions.open(echoDialog, { label: "one" })
    )

    expect(await screen.findByText("one")).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Echo one" })).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "resolve" }))

    await waitFor(() => expect(result.value).toBe("resolved:one"))
    expect(screen.queryByText("one")).toBeNull()
  })

  it("resolves with null when the surface dismisses", async () => {
    const h = harness()
    const result = openAndTrack(() =>
      h.actions.open(echoDialog, { label: "two" })
    )

    await screen.findByText("two")
    fireEvent.click(screen.getByRole("button", { name: "dismiss" }))

    await waitFor(() => expect(result.settled).toBe(true))
    expect(result.value).toBeNull()
  })

  it("resolves with null when the close button is used", async () => {
    const h = harness()
    const result = openAndTrack(() =>
      h.actions.open(echoDialog, { label: "x" })
    )

    await screen.findByText("x")
    fireEvent.click(screen.getByRole("button", { name: "Close" }))

    await waitFor(() => expect(result.settled).toBe(true))
    expect(result.value).toBeNull()
  })

  it("resolves with null when the provider unmounts with a dialog open", async () => {
    const h = harness()
    const result = openAndTrack(() =>
      h.actions.open(echoDialog, { label: "orphan" })
    )

    await screen.findByText("orphan")
    h.unmount()

    await waitFor(() => expect(result.settled).toBe(true))
    expect(result.value).toBeNull()
  })

  it("settles only once even if resolve is called twice", async () => {
    const h = harness()
    const result = openAndTrack(() =>
      h.actions.open(echoDialog, { label: "a" })
    )
    await screen.findByText("a")

    act(() => {
      expect(h.actions.resolve("dialog-1", "first")).toBe(true)
      expect(h.actions.resolve("dialog-1", "second")).toBe(false)
    })

    await waitFor(() => expect(result.value).toBe("first"))
  })

  it("opens payload-less dialogs without an argument", async () => {
    const h = harness()
    act(() => {
      void h.actions.open(titlebarActionsDialog)
    })
    expect(await screen.findByText("body")).toBeTruthy()
  })
})

describe("stacking", () => {
  it("stacks dialogs and settles each independently", async () => {
    const h = harness()
    const bottom = openAndTrack(() =>
      h.actions.open(echoDialog, { label: "bottom" })
    )
    await screen.findByText("bottom")
    const top = openAndTrack(() => h.actions.open(echoDialog, { label: "top" }))
    await screen.findByText("top")

    expect(frames()).toHaveLength(2)

    const resolveButtons = screen.getAllByRole("button", { name: "resolve" })
    fireEvent.click(resolveButtons[resolveButtons.length - 1]!)

    await waitFor(() => expect(top.value).toBe("resolved:top"))
    expect(bottom.settled).toBe(false)
    expect(screen.queryByText("top")).toBeNull()
    expect(screen.getByText("bottom")).toBeTruthy()
  })

  it("gives stacked dialogs an increasing z-order", async () => {
    const h = harness({ baseZIndex: 100 })
    act(() => {
      void h.actions.open(echoDialog, { label: "bottom" })
      void h.actions.open(echoDialog, { label: "top" })
    })
    await screen.findByText("top")

    expect(frames().map((node) => node.style.zIndex)).toEqual(["100", "110"])
  })

  it("marks only the last open dialog as topmost", async () => {
    const h = harness()
    act(() => {
      void h.actions.open(echoDialog, { label: "bottom" })
      void h.actions.open(echoDialog, { label: "top" })
    })
    await screen.findByText("top")

    expect(frames().map((node) => node.dataset.topmost)).toEqual([
      undefined,
      "true",
    ])
  })

  it("dismissAll settles every dialog with null", async () => {
    const h = harness()
    const first = openAndTrack(() => h.actions.open(echoDialog, { label: "1" }))
    const second = openAndTrack(() =>
      h.actions.open(echoDialog, { label: "2" })
    )
    await screen.findByText("2")

    act(() => h.actions.dismissAll())

    await waitFor(() => expect(first.settled && second.settled).toBe(true))
    expect([first.value, second.value]).toEqual([null, null])
    expect(frames()).toHaveLength(0)
  })

  it("exposes the stack through useDialogStack", async () => {
    let actions: DialogActions | undefined
    function Counter() {
      const current = useDialogs()
      React.useEffect(() => {
        actions = current
      })
      return <output>open: {useDialogStack().length}</output>
    }
    render(
      <DialogProvider frame={TestFrame} exitDuration={0}>
        <Counter />
      </DialogProvider>
    )
    expect(screen.getByText("open: 0")).toBeTruthy()

    act(() => {
      void actions!.open(echoDialog, { label: "counted" })
    })
    expect(await screen.findByText("open: 1")).toBeTruthy()
  })
})

describe("close routing", () => {
  it("routes Escape and outside presses through requestClose", async () => {
    const h = harness()
    const viaEscape = openAndTrack(() =>
      h.actions.open(echoDialog, { label: "e" })
    )
    await screen.findByText("e")

    fireEvent.keyDown(frames()[0]!, { key: "Escape" })
    await waitFor(() => expect(viaEscape.settled).toBe(true))

    const viaOutside = openAndTrack(() =>
      h.actions.open(echoDialog, { label: "o" })
    )
    await screen.findByText("o")

    fireEvent.pointerDown(screen.getByTestId("outside"))
    await waitFor(() => expect(viaOutside.settled).toBe(true))
  })

  it("ignores Escape and outside presses on a dialog that is not topmost", async () => {
    const h = harness()
    const bottom = openAndTrack(() =>
      h.actions.open(echoDialog, { label: "bottom" })
    )
    openAndTrack(() => h.actions.open(echoDialog, { label: "top" }))
    await screen.findByText("top")

    fireEvent.keyDown(frames()[0]!, { key: "Escape" })
    fireEvent.pointerDown(screen.getAllByTestId("outside")[0]!)

    await act(async () => {})
    expect(bottom.settled).toBe(false)
    expect(frames()).toHaveLength(2)
  })

  it("ignores outside presses on toasts and opted-out elements", async () => {
    const h = harness()
    const result = openAndTrack(() =>
      h.actions.open(echoDialog, { label: "t" })
    )
    await screen.findByText("t")
    const outside = screen.getByTestId("outside")

    for (const attribute of [
      "data-sonner-toaster",
      "data-dialog-ignore-outside",
    ]) {
      const toaster = document.createElement("div")
      toaster.setAttribute(attribute, "")
      const toast = document.createElement("button")
      toaster.append(toast)
      outside.append(toaster)

      fireEvent.pointerDown(toast)
      await act(async () => {})
      expect(result.settled).toBe(false)
      toaster.remove()
    }
  })

  it("respects closeOnEscape and closeOnOutsideClick", async () => {
    const h = harness()
    const result = openAndTrack(() => h.actions.open(lockedDialog))
    await screen.findByText("locked body")

    fireEvent.keyDown(frames()[0]!, { key: "Escape" })
    fireEvent.pointerDown(screen.getByTestId("outside"))
    await act(async () => {})

    expect(result.settled).toBe(false)
    expect(screen.queryByRole("button", { name: "Maximize" })).toBeNull()
  })
})

describe("close guards", () => {
  it("keeps the dialog open when the guard refuses", async () => {
    const h = harness()
    const result = openAndTrack(() =>
      h.actions.open(guardedDialog, { allow: () => false })
    )

    await screen.findByRole("button", { name: "save" })
    const id = screen.getByTestId("instance-id").textContent!

    let closed: boolean | undefined
    await act(async () => {
      closed = await h.actions.requestClose(id)
    })

    expect(closed).toBe(false)
    expect(result.settled).toBe(false)

    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    await act(async () => {})
    expect(screen.getByRole("button", { name: "save" })).toBeTruthy()
  })

  it("closes when the guard allows it", async () => {
    const h = harness()
    const result = openAndTrack(() =>
      h.actions.open(guardedDialog, { allow: async () => true })
    )

    await screen.findByRole("button", { name: "save" })
    fireEvent.click(screen.getByRole("button", { name: "Close" }))

    await waitFor(() => expect(result.settled).toBe(true))
    expect(result.value).toBeNull()
  })

  it("lets resolve() bypass the guard", async () => {
    const h = harness()
    const result = openAndTrack(() =>
      h.actions.open(guardedDialog, { allow: () => false })
    )

    fireEvent.click(await screen.findByRole("button", { name: "save" }))
    await waitFor(() => expect(result.value).toBe("saved"))
  })

  it("keeps the dialog open and reports when the guard throws", async () => {
    const onCloseGuardError = vi.fn()
    const h = harness({ onCloseGuardError })
    const boom = new Error("boom")
    const result = openAndTrack(() =>
      h.actions.open(guardedDialog, {
        allow: () => {
          throw boom
        },
      })
    )

    await screen.findByRole("button", { name: "save" })
    fireEvent.click(screen.getByRole("button", { name: "Close" }))

    await waitFor(() =>
      expect(onCloseGuardError).toHaveBeenCalledExactlyOnceWith(boom, {
        id: "dialog-1",
        kind: "guarded",
      })
    )
    expect(result.settled).toBe(false)
  })

  it("runs an async guard once even when close is requested repeatedly", async () => {
    let release: (allowed: boolean) => void = () => {}
    const allow = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          release = resolve
        })
    )
    const h = harness()
    const result = openAndTrack(() => h.actions.open(guardedDialog, { allow }))
    await screen.findByRole("button", { name: "save" })

    let first: Promise<boolean> | undefined
    let second: Promise<boolean> | undefined
    act(() => {
      first = h.actions.requestClose("dialog-1")
      second = h.actions.requestClose("dialog-1")
    })
    await act(async () => {})

    expect(allow).toHaveBeenCalledTimes(1)
    expect(first).toBe(second)

    await act(async () => {
      release(true)
      await first
    })
    expect(result.settled).toBe(true)
  })

  it("reports failure when closing a dialog that is not open", async () => {
    const h = harness()
    let closed: boolean | undefined
    await act(async () => {
      closed = await h.actions.requestClose("dialog-404")
    })
    expect(closed).toBe(false)
    expect(h.actions.dismiss("dialog-404")).toBe(false)
  })
})

describe("frame features", () => {
  it("toggles maximize", async () => {
    const h = harness()
    act(() => {
      void h.actions.open(echoDialog, { label: "max" })
    })
    await screen.findByText("max")

    expect(frames()[0]!.dataset.maximized).toBeUndefined()
    fireEvent.click(screen.getByRole("button", { name: "Maximize" }))
    await waitFor(() => expect(frames()[0]!.dataset.maximized).toBe("true"))
    fireEvent.click(screen.getByRole("button", { name: "Restore" }))
    await waitFor(() => expect(frames()[0]!.dataset.maximized).toBeUndefined())
  })

  it("portals titlebar actions into the titlebar", async () => {
    const h = harness()
    act(() => {
      void h.actions.open(titlebarActionsDialog)
    })

    const action = await screen.findByRole("button", { name: "custom action" })
    expect(action.closest('[data-dialog-part="titlebar"]')).not.toBeNull()
  })

  it("keeps the actions object referentially stable across stack changes", async () => {
    const h = harness()
    act(() => {
      void h.actions.open(echoDialog, { label: "stable" })
    })
    await screen.findByText("stable")
    fireEvent.click(screen.getByRole("button", { name: "resolve" }))
    await waitFor(() => expect(screen.queryByText("stable")).toBeNull())

    expect(new Set(h.identities).size).toBe(1)
  })
})

describe("provider defaults", () => {
  const plainDialog = defineDialog({
    kind: "plain",
    title: "Plain",
    component: () => <p>plain body</p>,
  })

  const optedInDialog = defineDialog({
    kind: "opted-in",
    title: "Opted in",
    maximizable: true,
    draggable: true,
    width: "3xl",
    component: () => <p>opted-in body</p>,
  })

  it("uses the built-ins when neither the provider nor the definition sets an option", async () => {
    const h = harness()
    act(() => {
      void h.actions.open(plainDialog)
    })
    await screen.findByText("plain body")

    const frame = frames()[0]!
    expect(frame.dataset.width).toBe("lg")
    expect(frame.dataset.height).toBe("auto")
    expect(frame.dataset.draggable).toBe("true")
    expect(screen.getByRole("button", { name: "Maximize" })).toBeTruthy()
  })

  it("applies the provider's defaults to definitions that don't set the option", async () => {
    const h = harness({
      defaults: {
        maximizable: false,
        draggable: false,
        width: "sm",
        height: "tall",
      },
    })
    act(() => {
      void h.actions.open(plainDialog)
    })
    await screen.findByText("plain body")

    const frame = frames()[0]!
    expect(frame.dataset.width).toBe("sm")
    expect(frame.dataset.height).toBe("tall")
    expect(frame.dataset.draggable).toBeUndefined()
    expect(screen.queryByRole("button", { name: "Maximize" })).toBeNull()
  })

  it("lets a definition opt back in to what the provider turned off", async () => {
    const h = harness({
      defaults: { maximizable: false, draggable: false, width: "sm" },
    })
    act(() => {
      void h.actions.open(optedInDialog)
    })
    await screen.findByText("opted-in body")

    const frame = frames()[0]!
    expect(frame.dataset.width).toBe("3xl")
    expect(frame.dataset.draggable).toBe("true")
    expect(screen.getByRole("button", { name: "Maximize" })).toBeTruthy()
  })

  it("applies close defaults to Escape and outside presses", async () => {
    const h = harness({
      defaults: { closeOnEscape: false, closeOnOutsideClick: false },
    })
    const result = openAndTrack(() => h.actions.open(plainDialog))
    await screen.findByText("plain body")

    fireEvent.keyDown(frames()[0]!, { key: "Escape" })
    fireEvent.pointerDown(screen.getByTestId("outside"))
    await act(async () => {})
    expect(result.settled).toBe(false)

    // the close button is not governed by these options
    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    await waitFor(() => expect(result.settled).toBe(true))
  })

  it("keeps the actions object stable when defaults are passed inline", async () => {
    const h = harness({ defaults: { maximizable: false } })
    act(() => {
      void h.actions.open(plainDialog)
    })
    await screen.findByText("plain body")
    expect(new Set(h.identities).size).toBe(1)
  })
})

describe("lifecycle", () => {
  it("keeps a closed dialog mounted for exitDuration, then removes it", async () => {
    vi.useFakeTimers()
    try {
      const h = harness({ exitDuration: 150 })
      const result = openAndTrack(() =>
        h.actions.open(echoDialog, { label: "fade" })
      )
      expect(screen.getByText("fade")).toBeTruthy()

      fireEvent.click(screen.getByRole("button", { name: "resolve" }))
      await act(async () => {})

      // the promise settles immediately; the frame lingers to animate out
      expect(result.value).toBe("resolved:fade")
      expect(frames()[0]!.dataset.state).toBe("closing")

      await act(async () => {
        vi.advanceTimersByTime(150)
      })
      expect(frames()).toHaveLength(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it("does not leave orphaned frames under StrictMode", async () => {
    function OpensOnMount() {
      const { open } = useDialogs()
      React.useEffect(() => {
        void open(echoDialog, { label: "on-mount" })
      }, [open])
      return null
    }

    render(
      <React.StrictMode>
        <DialogProvider frame={TestFrame} exitDuration={0}>
          <OpensOnMount />
        </DialogProvider>
      </React.StrictMode>
    )

    await screen.findByText("on-mount")
    expect(frames()).toHaveLength(1)
  })

  it("throws a helpful error outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    function Orphan() {
      useDialogs()
      return null
    }
    expect(() => render(<Orphan />)).toThrow(/inside <DialogProvider>/)
    spy.mockRestore()
  })
})
