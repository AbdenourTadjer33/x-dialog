import * as React from "react"
import { ShieldCheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { Dialog, defineDialog, type DialogProps } from "@/components/x-dialog"
import { formatMoney } from "@/store/back-office"

const MANAGERS: Record<string, string> = { "1234": "Sam (store manager)" }

function ManagerApprovalSurface({
  payload,
  resolve,
  dismiss,
}: DialogProps<
  { amountCents: number; reason: string },
  { approvedBy: string }
>) {
  const [pin, setPin] = React.useState("")
  const [error, setError] = React.useState(false)

  function submit(value: string) {
    const manager = MANAGERS[value]
    if (manager) resolve({ approvedBy: manager })
    else {
      setError(true)
      setPin("")
    }
  }

  return (
    <form
      className="contents"
      onSubmit={(event) => {
        event.preventDefault()
        submit(pin)
      }}
    >
      <Dialog.Body>
        <Field data-invalid={error || undefined}>
          <FieldLabel htmlFor="manager-pin">
            Manager PIN for a {formatMoney(payload.amountCents)}{" "}
            {payload.reason}
          </FieldLabel>
          <InputOTP
            id="manager-pin"
            data-autofocus
            maxLength={4}
            value={pin}
            aria-invalid={error || undefined}
            onChange={(value) => {
              setPin(value)
              setError(false)
            }}
            onComplete={submit}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
            </InputOTPGroup>
          </InputOTP>
          {error ? (
            <FieldError>That PIN doesn't match a manager.</FieldError>
          ) : (
            <FieldDescription>The demo PIN is 1234.</FieldDescription>
          )}
        </Field>
      </Dialog.Body>
      <Dialog.Footer>
        <Button type="button" variant="outline" onClick={dismiss}>
          Cancel
        </Button>
        <Button type="submit" disabled={pin.length < 4}>
          Approve
        </Button>
      </Dialog.Footer>
    </form>
  )
}

/** Opened from inside the refund dialog, on top of it. */
export const managerApprovalDialog = defineDialog<
  { amountCents: number; reason: string },
  { approvedBy: string }
>({
  kind: "manager-approval",
  title: "Manager approval",
  icon: ShieldCheckIcon,
  width: "sm",
  maximizable: false,
  closeOnOutsideClick: false,
  component: ManagerApprovalSurface,
})
