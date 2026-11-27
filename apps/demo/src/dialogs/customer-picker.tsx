import * as React from "react"
import { RefreshCwIcon, SearchIcon, UsersIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, defineDialog, type DialogProps } from "@/components/x-dialog"
import { cn } from "@/lib/utils"

export type Customer = {
  id: string
  name: string
  company: string
  plan: "Free" | "Pro" | "Team"
}

const FIRST = [
  "Amira",
  "Jonas",
  "Leila",
  "Mateo",
  "Noor",
  "Oskar",
  "Priya",
  "Rafael",
  "Sana",
  "Tomás",
  "Yara",
  "Zoe",
]
const LAST = [
  "Haddad",
  "Berg",
  "Mansouri",
  "Silva",
  "Khan",
  "Lind",
  "Rao",
  "Costa",
  "Ito",
  "Vidal",
  "Nassar",
  "Klein",
]
const COMPANIES = [
  "Northwind",
  "Acme Labs",
  "Lumen",
  "Orbit",
  "Fieldnote",
  "Kestrel",
  "Paperplane",
  "Quarry",
]
const PLANS: Customer["plan"][] = ["Free", "Pro", "Team"]

/** 48 distinct customers; `seed` rotates who comes first. */
function makeCustomers(seed: number): Customer[] {
  return Array.from({ length: 48 }, (_, index) => {
    const n = (index + seed) % 48
    const first = n % FIRST.length
    // each first name pairs with 4 different last names, never the same one twice
    const last = (first + 5 * Math.floor(n / FIRST.length) + 1) % LAST.length
    return {
      id: `cus_${(n * 7919 + 4099).toString(36)}`,
      name: `${FIRST[first]} ${LAST[last]}`,
      company: COMPANIES[(n * 5 + Math.floor(n / 8)) % COMPANIES.length]!,
      plan: PLANS[(n * 7 + 1) % PLANS.length]!,
    }
  })
}

function CustomerPickerSurface({
  resolve,
  dismiss,
}: DialogProps<void, Customer>) {
  const [seed, setSeed] = React.useState(1)
  const [query, setQuery] = React.useState("")
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const customers = React.useMemo(() => makeCustomers(seed), [seed])
  const visible = customers.filter((customer) =>
    `${customer.name} ${customer.company} ${customer.id}`
      .toLowerCase()
      .includes(query.trim().toLowerCase())
  )
  const selected = customers.find((customer) => customer.id === selectedId)

  return (
    <>
      <Dialog.TitlebarActions>
        <button
          type="button"
          aria-label="Reload customers"
          title="Reload customers"
          onClick={() => {
            setSeed((current) => current + 13)
            setSelectedId(null)
          }}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:size-3.5"
        >
          <RefreshCwIcon />
        </button>
      </Dialog.TitlebarActions>

      <Dialog.Toolbar>
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-autofocus
            aria-label="Search customers"
            placeholder="Search by name, company or id"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-8"
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {visible.length} of {customers.length}
        </span>
      </Dialog.Toolbar>

      <Dialog.Body className="p-2">
        {visible.length === 0 ? (
          <p className="p-6 text-center text-muted-foreground">
            No customer matches “{query}”. Try a company name.
          </p>
        ) : (
          <ul className="flex flex-col" aria-label="Customers">
            {visible.map((customer) => (
              <li key={customer.id}>
                <button
                  type="button"
                  aria-pressed={customer.id === selectedId}
                  onClick={() => setSelectedId(customer.id)}
                  onDoubleClick={() => resolve(customer)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50",
                    customer.id === selectedId && "bg-muted"
                  )}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {customer.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {customer.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {customer.company} · {customer.id}
                    </span>
                  </span>
                  <Badge
                    variant={customer.plan === "Free" ? "outline" : "secondary"}
                  >
                    {customer.plan}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Dialog.Body>

      <Dialog.Footer>
        <span className="mr-auto hidden truncate text-xs text-muted-foreground sm:block">
          {selected
            ? `Selected: ${selected.name}`
            : "Double-click a row to choose it."}
        </span>
        <Button variant="outline" onClick={dismiss}>
          Cancel
        </Button>
        <Button
          disabled={!selected}
          onClick={() => selected && resolve(selected)}
        >
          Choose customer
        </Button>
      </Dialog.Footer>
    </>
  )
}

export const customerPickerDialog = defineDialog<void, Customer>({
  kind: "customer-picker",
  title: "Choose a customer",
  description: "A working surface: toolbar, scrolling body, titlebar action",
  icon: UsersIcon,
  width: "3xl",
  height: "tall",
  closeOnOutsideClick: false,
  component: CustomerPickerSurface,
})
