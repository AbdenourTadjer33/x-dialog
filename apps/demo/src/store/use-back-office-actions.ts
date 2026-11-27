import { useDialogs } from "@/components/x-dialog"
import { confirmDialog } from "@/dialogs/confirm"
import { countCashDialog, registerReportDialog } from "@/dialogs/close-register"
import { customerPickerDialog } from "@/dialogs/customer-picker"
import { adjustStockDialog } from "@/dialogs/adjust-stock"
import { productFormDialog } from "@/dialogs/product-form"
import { refundOrderDialog } from "@/dialogs/refund-order"
import { shortcutsDialog } from "@/dialogs/shortcuts"
import { usePromiseLog } from "@/lib/promise-log"
import {
  formatMoney,
  useBackOffice,
  type Order,
  type Product,
} from "./back-office"

/**
 * Every action in the back office is a plain async function that awaits
 * dialogs. `track()` only feeds the demo's promise log; remove it and this is
 * exactly what the code would look like in an app.
 */
export function useBackOfficeActions() {
  const { open } = useDialogs()
  const { track } = usePromiseLog()
  const office = useBackOffice()

  async function createProduct() {
    office.setTab("products")
    const product = await track(
      "open(productFormDialog, {})",
      open(productFormDialog, {})
    )
    if (product) office.highlight(`product:${product.id}`)
  }

  async function editProduct(product: Product) {
    office.setTab("products")
    const saved = await track(
      `open(productFormDialog, { product: ${product.sku} })`,
      open(productFormDialog, { product })
    )
    if (saved) office.highlight(`product:${saved.id}`)
  }

  async function adjustStock(product: Product) {
    office.setTab("products")
    const updated = await track(
      `open(adjustStockDialog, { product: ${product.sku} })`,
      open(adjustStockDialog, { product })
    )
    if (updated) office.highlight(`product:${updated.id}`)
  }

  async function refundOrder(order: Order) {
    office.setTab("orders")
    const refund = await track(
      `open(refundOrderDialog, { order: #${order.number} })`,
      open(refundOrderDialog, { order })
    )
    if (refund) office.highlight(`order:${order.id}`)
  }

  async function assignCustomer(order: Order) {
    office.setTab("orders")
    const customer = await track(
      "open(customerPickerDialog)",
      open(customerPickerDialog)
    )
    if (!customer) return
    office.assignCustomer(order.id, customer.name)
    office.highlight(`order:${order.id}`)
  }

  async function closeRegister() {
    const expectedCents = office.expectedCashCents

    const count = await track(
      `open(countCashDialog, { expectedCents: ${expectedCents} })`,
      open(countCashDialog, { expectedCents })
    )
    if (!count) return

    const difference = count.countedCents - expectedCents
    if (difference !== 0) {
      const confirmed = await track(
        'open(confirmDialog, { title: "Cash is off…" })',
        open(confirmDialog, {
          title: `Cash is ${difference > 0 ? "over" : "short"} by ${formatMoney(Math.abs(difference))}`,
          description: "The difference will be recorded on today's report.",
          confirmLabel: "Close anyway",
        })
      )
      if (!confirmed) return
    }

    const closing = {
      expectedCents,
      countedCents: count.countedCents,
      orders: office.orders.length,
      refundedCents: office.orders.reduce(
        (sum, order) => sum + order.refundedCents,
        0
      ),
    }
    await office.closeRegister(closing)
    await track(
      "open(registerReportDialog, closing)",
      open(registerReportDialog, closing)
    )
  }

  async function showShortcuts() {
    await track("open(shortcutsDialog)", open(shortcutsDialog))
  }

  return {
    createProduct,
    editProduct,
    adjustStock,
    refundOrder,
    assignCustomer,
    closeRegister,
    showShortcuts,
  }
}
