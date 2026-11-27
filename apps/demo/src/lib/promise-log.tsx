import * as React from "react"

export type LogStatus = "pending" | "resolved" | "dismissed"

export type LogEntry = {
  id: number
  /** The call as written in code, e.g. `open(renameDialog, { … })`. */
  call: string
  status: LogStatus
  value?: unknown
  startedAt: number
  settledAt?: number
}

type PromiseLogValue = {
  entries: LogEntry[]
  /** Record a dialog call and update its entry when the promise settles. */
  track: <T>(call: string, promise: Promise<T | null>) => Promise<T | null>
  clear: () => void
}

const PromiseLogContext = React.createContext<PromiseLogValue | null>(null)

const MAX_ENTRIES = 30

export function PromiseLogProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [entries, setEntries] = React.useState<LogEntry[]>([])
  const nextId = React.useRef(1)

  const track = React.useCallback(
    <T,>(call: string, promise: Promise<T | null>) => {
      const id = nextId.current++
      setEntries((current) =>
        [
          {
            id,
            call,
            status: "pending" as const,
            startedAt: performance.now(),
          },
          ...current,
        ].slice(0, MAX_ENTRIES)
      )

      return promise.then((value) => {
        setEntries((current) =>
          current.map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  status: value === null ? "dismissed" : "resolved",
                  value,
                  settledAt: performance.now(),
                }
              : entry
          )
        )
        return value
      })
    },
    []
  )

  const clear = React.useCallback(() => setEntries([]), [])

  const value = React.useMemo(
    () => ({ entries, track, clear }),
    [clear, entries, track]
  )

  return (
    <PromiseLogContext.Provider value={value}>
      {children}
    </PromiseLogContext.Provider>
  )
}

export function usePromiseLog(): PromiseLogValue {
  const value = React.useContext(PromiseLogContext)
  if (!value)
    throw new Error("usePromiseLog must be used inside PromiseLogProvider")
  return value
}
