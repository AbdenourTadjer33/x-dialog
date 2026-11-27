import { PlayIcon } from "lucide-react"

import { BackOffice } from "@/components/back-office"
import { Code } from "@/components/code"
import { Button } from "@/components/ui/button"
import { useBackOffice } from "@/store/back-office"
import { useBackOfficeActions } from "@/store/use-back-office-actions"

type UseCase = {
  id: string
  title: string
  body: string
  action: string
  code: string
}

/* The snippets are the real call sites in src/store and src/dialogs, trimmed. */
const USE_CASES: UseCase[] = [
  {
    id: "create",
    title: "Create a record and get it back",
    body: "The form validates, saves, and resolves with the saved product. The caller gets a typed Product to highlight or navigate to — or null if the user backed out. Leaving with unsaved input asks first.",
    action: "New product",
    code: `
async function createProduct() {
  const product = await open(productFormDialog, {})
  if (product) highlight(product.id) // product: Product
}`,
  },
  {
    id: "save",
    title: "Save inside the dialog, stay open on failure",
    body: "The surface runs the request itself. While it's pending nothing can close the dialog; if the server says no, the error appears in place and the user can fix it. The caller only ever sees success.",
    action: "Adjust kettle stock",
    code: `
useDialogCloseGuard(() => !saving) // no closing mid-request

async function onSubmit() {
  setSaving(true)
  try {
    resolve(await adjustStock(product.id, delta, reason))
  } catch (error) {
    setError(error.message) // "Only 4 in stock…" — dialog stays open
  } finally {
    setSaving(false)
  }
}`,
  },
  {
    id: "approval",
    title: "Ask for approval halfway through",
    body: "Refunds over $50 need a manager. The refund dialog awaits a PIN dialog stacked on top, keeps its own state while it's open, and carries on — or stays put if the manager says no.",
    action: "Refund order #1041",
    code: `
// inside the refund dialog's submit handler
if (amountCents > APPROVAL_THRESHOLD_CENTS) {
  const approval = await open(managerApprovalDialog, { amountCents })
  if (!approval) return // stay in the refund dialog
  approvedBy = approval.approvedBy
}

await refundOrder({ ...refund, approvedBy })
resolve(refund)`,
  },
  {
    id: "chain",
    title: "Chain steps like ordinary code",
    body: "Closing the register is three dialogs, and one of them only appears when the count is off. With awaits it reads top to bottom — no step state machine, no callbacks.",
    action: "Close the register",
    code: `
async function closeRegister() {
  const count = await open(countCashDialog, { expectedCents })
  if (!count) return

  const difference = count.countedCents - expectedCents
  if (difference !== 0) {
    const ok = await open(confirmDialog, { title: "Cash is short by …" })
    if (!ok) return
  }

  await saveClosing(count)
  await open(registerReportDialog, closing)
}`,
  },
  {
    id: "pick",
    title: "Pick from a long list",
    body: "A picker is a dialog that resolves with the chosen item: search in the toolbar, a scrolling list, a pinned footer. Outside clicks are off so a stray click can't lose the selection.",
    action: "Assign a customer",
    code: `
async function assignCustomer(order: Order) {
  const customer = await open(customerPickerDialog)
  if (customer) setCustomer(order.id, customer.name)
}`,
  },
  {
    id: "anywhere",
    title: "Open from anywhere, even a shortcut",
    body: "open() never changes identity, so it can live in a global key handler with an empty dependency list. Press ? on this page.",
    action: "Show shortcuts",
    code: `
const { open } = useDialogs()

useEffect(() => {
  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "?") void open(shortcutsDialog)
  }
  window.addEventListener("keydown", onKeyDown)
  return () => window.removeEventListener("keydown", onKeyDown)
}, [open]) // stable: this effect runs once`,
  },
]

function useRunners() {
  const actions = useBackOfficeActions()
  const office = useBackOffice()

  return (id: string) => {
    switch (id) {
      case "create":
        return actions.createProduct()
      case "save": {
        const kettle =
          office.products.find((p) => p.sku === "GEAR-KETL") ??
          office.products[0]
        return kettle ? actions.adjustStock(kettle) : undefined
      }
      case "approval": {
        const order =
          office.orders.find((o) => orderRefundable(o)) ?? office.orders[0]
        return order ? actions.refundOrder(order) : undefined
      }
      case "chain":
        return actions.closeRegister()
      case "pick": {
        const walkIn =
          office.orders.find((o) => !o.customer) ?? office.orders[0]
        return walkIn ? actions.assignCustomer(walkIn) : undefined
      }
      case "anywhere":
        return actions.showShortcuts()
    }
  }
}

function orderRefundable(order: {
  lines: { quantity: number; refunded: number }[]
}) {
  return order.lines.some((line) => line.quantity > line.refunded)
}

export function UseCases() {
  const run = useRunners()

  return (
    <section
      id="use-cases"
      className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-16"
    >
      <div className="mb-10 max-w-2xl">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Use cases
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          A small coffee-shop back office where every action is an awaited
          dialog — the same patterns as production apps built on x-dialog. Use
          the app directly, or start from the list.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12">
        <ol className="flex flex-col">
          {USE_CASES.map((useCase) => (
            <li
              key={useCase.id}
              className="flex flex-col gap-3 border-t py-8 first:border-t-0 first:pt-0"
            >
              <h3 className="font-display text-xl font-semibold tracking-tight">
                {useCase.title}
              </h3>
              <p className="leading-relaxed text-muted-foreground">
                {useCase.body}
              </p>
              <Code code={useCase.code} />
              <div>
                <Button variant="outline" onClick={() => void run(useCase.id)}>
                  <PlayIcon data-icon="inline-start" />
                  {useCase.action}
                </Button>
              </div>
            </li>
          ))}
        </ol>

        <div className="order-first lg:order-none">
          <BackOffice className="lg:sticky lg:top-20" />
        </div>
      </div>
    </section>
  )
}
