import type { DialogCloseGuard } from "../types"

type DialogSettler = (result: unknown) => void

/**
 * Bookkeeping for the dialogs that are currently open: each one's pending
 * promise settler, its close guard, and any close request in flight.
 *
 * These are functions, so they stay out of reducer state — the stack remains
 * plain, printable data. One instance per provider, which also means ids
 * restart at `dialog-1` for every mount.
 */
export class PendingDialogs {
  private readonly settlers = new Map<string, DialogSettler>()
  private readonly guards = new Map<string, DialogCloseGuard>()
  private readonly closing = new Map<string, Promise<boolean>>()
  private readonly kinds = new Map<string, string>()
  private counter = 0

  nextId(): string {
    this.counter += 1
    return `dialog-${this.counter}`
  }

  add(id: string, settler: DialogSettler, kind = ""): void {
    this.settlers.set(id, settler)
    this.kinds.set(id, kind)
  }

  /** The `kind` the dialog was opened with, for error reports. */
  kindOf(id: string): string {
    return this.kinds.get(id) ?? ""
  }

  has(id: string): boolean {
    return this.settlers.has(id)
  }

  /** Ids of every unsettled dialog, oldest first. */
  ids(): string[] {
    return Array.from(this.settlers.keys())
  }

  /** Returns `false` when the id is not open — a stale close must not report success. */
  settle(id: string, result: unknown): boolean {
    const settler = this.settlers.get(id)
    if (!settler) return false

    this.settlers.delete(id)
    this.guards.delete(id)
    this.closing.delete(id)
    this.kinds.delete(id)
    settler(result)
    return true
  }

  setGuard(id: string, guard: DialogCloseGuard | null): void {
    if (guard) this.guards.set(id, guard)
    else this.guards.delete(id)
  }

  getGuard(id: string): DialogCloseGuard | undefined {
    return this.guards.get(id)
  }

  /**
   * Run `request` at most once at a time per dialog.
   *
   * Pressing Escape twice while an async guard is still deciding must not run
   * the guard twice (and open two "discard changes?" prompts).
   */
  dedupeClose(id: string, request: () => Promise<boolean>): Promise<boolean> {
    const inFlight = this.closing.get(id)
    if (inFlight) return inFlight

    const next = request().finally(() => {
      if (this.closing.get(id) === next) this.closing.delete(id)
    })
    this.closing.set(id, next)
    return next
  }

  /** Settle everything with `null`, so unmounting never leaves a caller awaiting forever. */
  settleAll(): void {
    const settlers = Array.from(this.settlers.values())
    this.settlers.clear()
    this.guards.clear()
    this.closing.clear()
    this.kinds.clear()
    settlers.forEach((settler) => settler(null))
  }
}
