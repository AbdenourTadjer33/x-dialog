import * as React from "react"
import { PackagePlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog,
  defineDialog,
  useDialogCloseGuard,
  useDialogs,
  type DialogProps,
} from "@/components/x-dialog"
import { ApiError, useBackOffice, type Product } from "@/store/back-office"
import { confirmDialog } from "./confirm"

type Values = { name: string; sku: string; price: string; stock: string }
type Errors = Partial<Record<keyof Values, string>>

function toValues(product?: Product): Values {
  return {
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    price: product ? (product.priceCents / 100).toFixed(2) : "",
    stock: product ? String(product.stock) : "0",
  }
}

function validate(values: Values): Errors {
  const errors: Errors = {}
  if (!values.name.trim()) errors.name = "Enter a product name."
  if (!/^[A-Z0-9-]{3,}$/i.test(values.sku.trim()))
    errors.sku = "Use at least 3 letters, digits or dashes."
  const price = Number(values.price)
  if (!values.price || Number.isNaN(price) || price <= 0)
    errors.price = "Enter a price above 0."
  if (!/^\d+$/.test(values.stock)) errors.stock = "Enter a whole number."
  return errors
}

function ProductFormSurface({
  payload,
  resolve,
  dismiss,
}: DialogProps<{ product?: Product }, Product>) {
  const { open } = useDialogs()
  const { saveProduct } = useBackOffice() // the app's own context — dialogs share it
  const initial = React.useMemo(
    () => toValues(payload.product),
    [payload.product]
  )
  const [values, setValues] = React.useState(initial)
  const [errors, setErrors] = React.useState<Errors>({})
  const [saving, setSaving] = React.useState(false)

  const isDirty = (Object.keys(values) as (keyof Values)[]).some(
    (key) => values[key] !== initial[key]
  )

  useDialogCloseGuard(async () => {
    if (saving) return false // never drop a request in flight
    if (!isDirty) return true
    return (
      (await open(confirmDialog, {
        title: "Discard this product?",
        description: "The details you entered will be lost.",
        confirmLabel: "Discard",
        destructive: true,
      })) === true
    )
  })

  function set(key: keyof Values) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      setValues((current) => ({ ...current, [key]: event.target.value }))
      setErrors((current) => ({ ...current, [key]: undefined }))
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    try {
      const saved = await saveProduct({
        id: payload.product?.id,
        name: values.name.trim(),
        sku: values.sku,
        priceCents: Math.round(Number(values.price) * 100),
        stock: Number(values.stock),
      })
      resolve(saved)
    } catch (error) {
      // the server said no: show it in place and keep the dialog open
      if (error instanceof ApiError && error.field) {
        setErrors({ [error.field]: error.message })
      } else throw error
    } finally {
      setSaving(false)
    }
  }

  function field(
    key: keyof Values,
    label: string,
    props?: React.ComponentProps<"input">
  ) {
    return (
      <Field data-invalid={errors[key] ? true : undefined}>
        <FieldLabel htmlFor={`product-${key}`}>{label}</FieldLabel>
        <Input
          id={`product-${key}`}
          value={values[key]}
          onChange={set(key)}
          aria-invalid={errors[key] ? true : undefined}
          data-autofocus={key === "name" ? "" : undefined}
          disabled={saving}
          {...props}
        />
        {errors[key] ? <FieldError>{errors[key]}</FieldError> : null}
      </Field>
    )
  }

  return (
    <form className="contents" onSubmit={onSubmit} noValidate>
      <Dialog.Body>
        <FieldGroup>
          {field("name", "Name")}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {field("sku", "SKU", { className: "uppercase" })}
            {field("price", "Price (USD)", { inputMode: "decimal" })}
            {field("stock", "Stock", {
              inputMode: "numeric",
              disabled: saving || payload.product !== undefined,
            })}
          </div>
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
        <Button type="submit" disabled={saving}>
          {saving ? <Spinner data-icon="inline-start" /> : null}
          {payload.product ? "Save changes" : "Create product"}
        </Button>
      </Dialog.Footer>
    </form>
  )
}

/** Resolves with the saved product, or `null` when the user backs out. */
export const productFormDialog = defineDialog<{ product?: Product }, Product>({
  kind: "product-form",
  title: (payload) =>
    payload.product ? `Edit ${payload.product.name}` : "New product",
  description: (payload) =>
    payload.product
      ? payload.product.sku
      : "Try SKU GEAR-KETL to see a server error",
  icon: PackagePlusIcon,
  width: "lg",
  component: ProductFormSurface,
})
