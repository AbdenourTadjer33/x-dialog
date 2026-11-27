import * as React from "react"
import { PencilLineIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Dialog, defineDialog, type DialogProps } from "@/components/x-dialog"

function validate(name: string, original: string): string | null {
  if (!name.trim()) return "Enter a file name."
  if (/[\\/:*?"<>|]/.test(name)) return 'Remove \\ / : * ? " < > |'
  if (name === original) return "That's the current name."
  return null
}

function RenameSurface({
  payload,
  resolve,
  dismiss,
}: DialogProps<{ name: string }, string>) {
  const [name, setName] = React.useState(payload.name)
  const [touched, setTouched] = React.useState(false)
  const error = validate(name, payload.name)
  const showError = touched && error !== null

  return (
    // `contents` keeps body and footer as direct children of the frame
    <form
      className="contents"
      onSubmit={(event) => {
        event.preventDefault()
        setTouched(true)
        if (error === null) resolve(name.trim())
      }}
    >
      <Dialog.Body>
        <Field data-invalid={showError || undefined}>
          <FieldLabel htmlFor="rename-input">File name</FieldLabel>
          <Input
            id="rename-input"
            data-autofocus
            value={name}
            aria-invalid={showError || undefined}
            onChange={(event) => {
              setName(event.target.value)
              setTouched(true)
            }}
            onFocus={(event) => {
              // select the name without its extension, like a file manager
              const dot = event.target.value.lastIndexOf(".")
              event.target.setSelectionRange(
                0,
                dot > 0 ? dot : event.target.value.length
              )
            }}
          />
          {showError ? (
            <FieldError>{error}</FieldError>
          ) : (
            <FieldDescription>Press Enter to rename.</FieldDescription>
          )}
        </Field>
      </Dialog.Body>
      <Dialog.Footer>
        <Button type="button" variant="outline" onClick={dismiss}>
          Cancel
        </Button>
        <Button type="submit">Rename</Button>
      </Dialog.Footer>
    </form>
  )
}

export const renameDialog = defineDialog<{ name: string }, string>({
  kind: "rename",
  title: (payload) => `Rename ${payload.name}`,
  icon: PencilLineIcon,
  width: "sm",
  maximizable: false,
  component: RenameSurface,
})
