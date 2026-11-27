import * as React from "react"
import { CalculatorIcon, ClipboardCheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Dialog, defineDialog, type DialogProps } from "@/components/x-dialog"
import { cn } from "@/lib/utils"
import { formatMoney, type RegisterClosing } from "@/store/back-office"

/* -------------------------------------------------------------------------- */
/* Step 1 — count the drawer                                                  */
/* -------------------------------------------------------------------------- */

function CountCashSurface({
  payload,
  resolve,
  dismiss,
}: DialogProps<{ expectedCents: number }, { countedCents: number }>) {
  const [counted, setCounted] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  return (
    <form
      className="contents"
      onSubmit={(event) => {
        event.preventDefault()
        const value = Number(counted)
        if (!counted || Number.isNaN(value) || value < 0) {
          setError("Enter the amount in the drawer.")
          return
        }
        resolve({ countedCents: Math.round(value * 100) })
      }}
    >
      <Dialog.Body>
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="counted-cash">
            Cash in the drawer (USD)
          </FieldLabel>
          <Input
            id="counted-cash"
            data-autofocus
            inputMode="decimal"
            placeholder="0.00"
            value={counted}
            aria-invalid={error ? true : undefined}
            onChange={(event) => {
              setCounted(event.target.value)
              setError(null)
            }}
          />
          {error ? (
            <FieldError>{error}</FieldError>
          ) : (
            <FieldDescription>
              Expected {formatMoney(payload.expectedCents)}. Enter a different
              amount to see the follow-up question.
            </FieldDescription>
          )}
        </Field>
      </Dialog.Body>
      <Dialog.Footer>
        <Button
          type="button"
          variant="ghost"
          className="sm:mr-auto"
          onClick={() => setCounted((payload.expectedCents / 100).toFixed(2))}
        >
          Use expected amount
        </Button>
        <Button type="button" variant="outline" onClick={dismiss}>
          Cancel
        </Button>
        <Button type="submit">Continue</Button>
      </Dialog.Footer>
    </form>
  )
}

export const countCashDialog = defineDialog<
  { expectedCents: number },
  { countedCents: number }
>({
  kind: "count-cash",
  title: "Close the register",
  description: "Step 1 of 2 · count the cash",
  icon: CalculatorIcon,
  width: "sm",
  maximizable: false,
  component: CountCashSurface,
})

/* -------------------------------------------------------------------------- */
/* Step 2 — the report (read-only)                                            */
/* -------------------------------------------------------------------------- */

function Row({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "over" | "short"
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "font-medium tabular-nums",
          tone === "short" && "text-destructive",
          tone === "over" && "text-resolved"
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function RegisterReportSurface({
  payload,
  resolve,
}: DialogProps<RegisterClosing, void>) {
  const difference = payload.countedCents - payload.expectedCents
  return (
    <>
      <Dialog.Body>
        <dl className="divide-y">
          <Row label="Orders today" value={String(payload.orders)} />
          <Row label="Refunded" value={formatMoney(payload.refundedCents)} />
          <Row
            label="Expected in drawer"
            value={formatMoney(payload.expectedCents)}
          />
          <Row label="Counted" value={formatMoney(payload.countedCents)} />
          <Row
            label="Difference"
            value={`${difference > 0 ? "+" : ""}${formatMoney(difference)}`}
            tone={
              difference > 0 ? "over" : difference < 0 ? "short" : undefined
            }
          />
        </dl>
      </Dialog.Body>
      <Dialog.Footer>
        <Button data-autofocus onClick={() => resolve()}>
          Done
        </Button>
      </Dialog.Footer>
    </>
  )
}

export const registerReportDialog = defineDialog<RegisterClosing, void>({
  kind: "register-report",
  title: "Register closed",
  description: "Step 2 of 2 · today's report",
  icon: ClipboardCheckIcon,
  width: "sm",
  maximizable: false,
  component: RegisterReportSurface,
})
