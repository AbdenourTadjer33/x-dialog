import * as React from "react"
import { BoxesIcon, CircleAlertIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Dialog,
  defineDialog,
  useDialogCloseGuard,
  type DialogProps,
} from "@/components/x-dialog"
import {
  ApiError,
  useBackOffice,
  type Product,
  type StockReason,
} from "@/store/back-office"

type Direction = "add" | "remove"

const REASONS: { value: StockReason; label: string; direction: Direction }[] = [
  { value: "delivery", label: "Delivery", direction: "add" },
  { value: "recount", label: "Recount", direction: "add" },
  { value: "damaged", label: "Damaged", direction: "remove" },
]

function AdjustStockSurface({
  payload,
  resolve,
  dismiss,
}: DialogProps<{ product: Product }, Product>) {
  const { adjustStock } = useBackOffice()
  const [direction, setDirection] = React.useState<Direction>("add")
  const [reason, setReason] = React.useState<StockReason>("delivery")
  const [quantity, setQuantity] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  useDialogCloseGuard(() => !saving)

  const amount = Number(quantity)
  const valid = /^\d+$/.test(quantity) && amount > 0
  const delta = direction === "add" ? amount : -amount

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!valid) return
    setSaving(true)
    setError(null)
    try {
      resolve(await adjustStock(payload.product.id, delta, reason))
    } catch (caught) {
      if (caught instanceof ApiError) setError(caught.message)
      else throw caught
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="contents" onSubmit={onSubmit}>
      <Dialog.Body>
        <FieldGroup>
          {error ? (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>Stock wasn't changed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <FieldSet>
            <FieldLegend variant="label">Change</FieldLegend>
            <ToggleGroup
              variant="outline"
              value={[direction]}
              onValueChange={(next: string[]) => {
                const value = next[0] as Direction | undefined
                if (!value) return
                setDirection(value)
                setReason(value === "add" ? "delivery" : "damaged")
                setError(null)
              }}
            >
              <ToggleGroupItem value="add">Add stock</ToggleGroupItem>
              <ToggleGroupItem value="remove">Remove stock</ToggleGroupItem>
            </ToggleGroup>
          </FieldSet>

          <Field>
            <FieldLabel htmlFor="stock-quantity">Quantity</FieldLabel>
            <Input
              id="stock-quantity"
              data-autofocus
              inputMode="numeric"
              value={quantity}
              disabled={saving}
              onChange={(event) => {
                setQuantity(event.target.value)
                setError(null)
              }}
            />
            <FieldDescription>
              {payload.product.stock} in stock now
              {valid ? ` → ${payload.product.stock + delta} after saving` : ""}.
              Try removing more than that.
            </FieldDescription>
          </Field>

          <FieldSet>
            <FieldLegend variant="label">Reason</FieldLegend>
            <ToggleGroup
              variant="outline"
              size="sm"
              value={[reason]}
              onValueChange={(next: string[]) => {
                const value = next[0] as StockReason | undefined
                if (value) setReason(value)
              }}
            >
              {REASONS.filter((r) => r.direction === direction).map((r) => (
                <ToggleGroupItem key={r.value} value={r.value}>
                  {r.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </FieldSet>
        </FieldGroup>
      </Dialog.Body>
      <Dialog.Footer>
        <Button
          type="button"
          variant="outline"
          onClick={dismiss}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!valid || saving}>
          {saving ? <Spinner data-icon="inline-start" /> : null}
          {saving ? "Saving…" : "Save adjustment"}
        </Button>
      </Dialog.Footer>
    </form>
  )
}

/** Saves inside the dialog; resolves with the updated product once the server agrees. */
export const adjustStockDialog = defineDialog<{ product: Product }, Product>({
  kind: "adjust-stock",
  title: (payload) => `Adjust stock · ${payload.product.name}`,
  icon: BoxesIcon,
  width: "md",
  maximizable: false,
  component: AdjustStockSurface,
})
