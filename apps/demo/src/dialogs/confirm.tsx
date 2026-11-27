import { CircleAlertIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, defineDialog, type DialogProps } from "@/components/x-dialog"

export type ConfirmPayload = {
  title: string
  description: string
  confirmLabel: string
  destructive?: boolean
}

function ConfirmSurface({
  payload,
  resolve,
  dismiss,
}: DialogProps<ConfirmPayload, true>) {
  return (
    <>
      <Dialog.Body className="text-muted-foreground">
        {payload.description}
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="outline" onClick={dismiss}>
          Cancel
        </Button>
        <Button
          variant={payload.destructive ? "destructive" : "default"}
          onClick={() => resolve(true)}
        >
          {payload.confirmLabel}
        </Button>
      </Dialog.Footer>
    </>
  )
}

/** Resolves `true`, or `null` for every way of saying no. */
export const confirmDialog = defineDialog<ConfirmPayload, true>({
  kind: "confirm",
  title: (payload) => payload.title,
  icon: CircleAlertIcon,
  width: "sm",
  maximizable: false,
  component: ConfirmSurface,
})
