import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { usePromiseLog, type LogEntry, type LogStatus } from "@/lib/promise-log"
import { cn } from "@/lib/utils"

const STATUS_DOT: Record<LogStatus, string> = {
  pending: "bg-pending animate-pulse",
  resolved: "bg-resolved",
  dismissed: "bg-dismissed",
}

function formatValue(value: unknown): string {
  if (value === null) return "null"
  if (typeof value === "string") return JSON.stringify(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function Entry({ entry }: { entry: LogEntry }) {
  const duration =
    entry.settledAt !== undefined
      ? `${Math.round(entry.settledAt - entry.startedAt).toLocaleString()} ms`
      : null

  return (
    <li className="flex gap-2.5 px-3 py-2">
      <span
        aria-hidden
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          STATUS_DOT[entry.status]
        )}
      />
      <div className="min-w-0 flex-1 font-mono text-xs leading-5">
        <div className="truncate" title={entry.call}>
          <span className="text-muted-foreground">await </span>
          {entry.call}
        </div>
        <div
          className={cn(
            "flex gap-2",
            entry.status === "pending" && "text-pending",
            entry.status === "resolved" && "text-resolved",
            entry.status === "dismissed" && "text-dismissed"
          )}
        >
          <span className="min-w-0 flex-1 truncate">
            {entry.status === "pending"
              ? "pending…"
              : `→ ${formatValue(entry.value)}`}
          </span>
          {duration ? (
            <span className="text-muted-foreground tabular-nums">
              {duration}
            </span>
          ) : null}
        </div>
      </div>
    </li>
  )
}

/**
 * The page's memorable bit: every `await open(...)` lands here as pending and
 * settles in place. It sits under the dialog layer so it never covers one.
 */
export function PromiseLog() {
  const { entries, clear } = usePromiseLog()
  // collapsed on phones, where an open log would cover the page
  const [expanded, setExpanded] = React.useState(
    () => window.matchMedia("(min-width: 640px)").matches
  )
  const pending = entries.filter((entry) => entry.status === "pending").length

  return (
    <aside
      aria-label="Promise log"
      // clicks here must never count as "outside" a dialog
      data-dialog-ignore-outside=""
      className="fixed right-4 bottom-4 z-40 w-[min(25rem,calc(100vw-2rem))] overflow-hidden rounded-xl bg-popover/95 text-popover-foreground shadow-xl ring-1 ring-foreground/10 backdrop-blur"
    >
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          className="flex flex-1 items-center gap-2 text-left text-sm font-medium outline-none"
        >
          <ChevronDownIcon
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              !expanded && "-rotate-90"
            )}
          />
          Promise log
          {pending > 0 ? (
            <span className="rounded-full bg-pending/15 px-1.5 text-xs text-pending tabular-nums">
              {pending} pending
            </span>
          ) : null}
        </button>
        {entries.length > 0 ? (
          <button
            type="button"
            onClick={clear}
            className="rounded px-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        ) : null}
      </div>
      {expanded ? (
        entries.length === 0 ? (
          <p className="px-3 py-4 text-xs leading-5 text-muted-foreground">
            Open any dialog on this page. Its promise shows up here and settles
            with the value you resolve, or{" "}
            <code className="font-mono">null</code> if you dismiss it.
          </p>
        ) : (
          <ol className="max-h-64 divide-y overflow-y-auto">
            {entries.map((entry) => (
              <Entry key={entry.id} entry={entry} />
            ))}
          </ol>
        )
      ) : null}
    </aside>
  )
}
