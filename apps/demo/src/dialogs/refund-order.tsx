import * as React from "react"
import { MinusIcon, PlusIcon, ReceiptTextIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Dialog,
  defineDialog,
  useDialogCloseGuard,
  useDialogs,
  type DialogProps,
} from "@/components/x-dialog"
import {
  APPROVAL_THRESHOLD_CENTS,
  formatMoney,
  useBackOffice,
  type Order,
  type Refund,
  type RefundMethod,
} from "@/store/back-office"
import { managerApprovalDialog } from "./manager-approval"

function RefundOrderSurface({
  payload,
  resolve,
  dismiss,
}: DialogProps<{ order: Order }, Refund>) {
  const { order } = payload
  const { open } = useDialogs()
  const { refundOrder } = useBackOffice()

  const refundable = order.lines.filter((line) => line.quantity > line.refunded)
  const [quantities, setQuantities] = React.useState<Record<string, number>>(
    () => Object.fromEntries(refundable.map((line) => [line.productId, 0]))
  )
  const [method, setMethod] = React.useState<RefundMethod>("original")
  const [restock, setRestock] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  useDialogCloseGuard(() => !saving)

  const amountCents = refundable.reduce(
    (sum, line) => sum + (quantities[line.productId] ?? 0) * line.unitCents,
    0
  )
  const needsApproval = amountCents > APPROVAL_THRESHOLD_CENTS

  function step(productId: string, by: number, max: number) {
    setQuantities((current) => ({
      ...current,
      [productId]: Math.min(max, Math.max(0, (current[productId] ?? 0) + by)),
    }))
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (amountCents === 0) return

    // a second dialog, awaited from inside this one — it stacks on top
    let approvedBy: string | null = null
    if (needsApproval) {
      const approval = await open(managerApprovalDialog, {
        amountCents,
        reason: "refund",
      })
      if (!approval) return // manager said no: stay here, nothing changed
      approvedBy = approval.approvedBy
    }

    const refund: Refund = {
      orderId: order.id,
      lines: refundable
        .map((line) => ({
          productId: line.productId,
          quantity: quantities[line.productId] ?? 0,
        }))
        .filter((line) => line.quantity > 0),
      amountCents,
      method,
      restock,
      approvedBy,
    }

    setSaving(true)
    try {
      await refundOrder(refund)
      resolve(refund)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="contents" onSubmit={onSubmit}>
      <Dialog.Body>
        <FieldGroup>
          <FieldSet>
            <FieldLegend variant="label">Items to refund</FieldLegend>
            <ul className="flex flex-col divide-y rounded-lg ring-1 ring-foreground/10">
              {refundable.map((line, index) => {
                const max = line.quantity - line.refunded
                const value = quantities[line.productId] ?? 0
                return (
                  <li
                    key={line.productId}
                    className="flex items-center gap-3 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{line.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatMoney(line.unitCents)} · {max} refundable
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label={`One less ${line.name}`}
                        disabled={value === 0 || saving}
                        onClick={() => step(line.productId, -1, max)}
                      >
                        <MinusIcon />
                      </Button>
                      <output
                        className="w-8 text-center tabular-nums"
                        aria-live="polite"
                        aria-label={`${line.name} quantity`}
                      >
                        {value}
                      </output>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label={`One more ${line.name}`}
                        data-autofocus={index === 0 ? "" : undefined}
                        disabled={value === max || saving}
                        onClick={() => step(line.productId, 1, max)}
                      >
                        <PlusIcon />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </FieldSet>

          <FieldSet>
            <FieldLegend variant="label">Refund to</FieldLegend>
            <ToggleGroup
              variant="outline"
              value={[method]}
              onValueChange={(next: string[]) => {
                const value = next[0] as RefundMethod | undefined
                if (value) setMethod(value)
              }}
            >
              <ToggleGroupItem value="original">
                {order.payment === "cash" ? "Cash" : "Card"}
              </ToggleGroupItem>
              <ToggleGroupItem value="store-credit">
                Store credit
              </ToggleGroupItem>
            </ToggleGroup>
          </FieldSet>

          <Field orientation="horizontal">
            <Checkbox
              id="refund-restock"
              checked={restock}
              onCheckedChange={(checked) => setRestock(checked === true)}
            />
            <FieldLabel htmlFor="refund-restock">
              Put the items back in stock
            </FieldLabel>
          </Field>
        </FieldGroup>
      </Dialog.Body>
      <Dialog.Footer>
        <span className="mr-auto text-xs text-muted-foreground">
          {needsApproval
            ? `Over ${formatMoney(APPROVAL_THRESHOLD_CENTS)} needs a manager's PIN.`
            : `Refunds over ${formatMoney(APPROVAL_THRESHOLD_CENTS)} need approval.`}
        </span>
        <Button
          type="button"
          variant="outline"
          onClick={dismiss}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={amountCents === 0 || saving}>
          {saving ? <Spinner data-icon="inline-start" /> : null}
          Refund {formatMoney(amountCents)}
        </Button>
      </Dialog.Footer>
    </form>
  )
}

/** Resolves with the recorded refund, or `null` if nothing was refunded. */
export const refundOrderDialog = defineDialog<{ order: Order }, Refund>({
  kind: "refund-order",
  title: (payload) => `Refund order #${payload.order.number}`,
  description: (payload) => payload.order.customer ?? "Walk-in customer",
  icon: ReceiptTextIcon,
  width: "xl",
  component: RefundOrderSurface,
})
