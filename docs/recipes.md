# Recipes

Copy-paste patterns. Each assumes `import { … } from "@/components/ui/x-dialog"`.

- [Confirm](#confirm)
- [Form with validation](#form-with-validation)
- [Guard unsaved changes](#guard-unsaved-changes)
- [Picker (a working surface)](#picker-a-working-surface)
- [Await a dialog from inside a dialog](#await-a-dialog-from-inside-a-dialog)
- [Titlebar buttons](#titlebar-buttons)
- [Async work inside a dialog](#async-work-inside-a-dialog)
- [Close everything on navigation](#close-everything-on-navigation)
- [App-wide defaults](#app-wide-defaults)
- [Translate the titlebar](#translate-the-titlebar)
- [Testing](#testing)

---

## Confirm

One generic confirm covers most of an app.

```tsx
type ConfirmPayload = {
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

export const confirmDialog = defineDialog<ConfirmPayload, true>({
  kind: "confirm",
  title: (payload) => payload.title,
  width: "sm",
  maximizable: false,
  component: ConfirmSurface,
})
```

```tsx
if (
  await open(confirmDialog, {
    title: "Delete 3 files?",
    description: "They will be removed from the project.",
    confirmLabel: "Delete",
    destructive: true,
  })
) {
  await deleteFiles(selection)
}
```

The result type is `true`, so the call site reads as a boolean and `null` is "no".
Focus lands on **Cancel** — the first tabbable element — which is the safe default.

---

## Form with validation

Wrap the slots in `<form className="contents">`: the footer stays pinned and Enter
submits natively. Works the same with react-hook-form.

```tsx
function InviteSurface({
  resolve,
  dismiss,
}: DialogProps<void, { email: string }>) {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      className="contents"
      onSubmit={(event) => {
        event.preventDefault()
        if (!email.includes("@")) return setError("Enter an email address.")
        resolve({ email })
      }}
    >
      <Dialog.Body>
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="invite-email">Email</FieldLabel>
          <Input
            id="invite-email"
            data-autofocus
            value={email}
            aria-invalid={error ? true : undefined}
            onChange={(event) => setEmail(event.target.value)}
          />
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
      </Dialog.Body>
      <Dialog.Footer>
        <Button type="button" variant="outline" onClick={dismiss}>
          Cancel
        </Button>
        <Button type="submit">Send invite</Button>
      </Dialog.Footer>
    </form>
  )
}

export const inviteDialog = defineDialog<void, { email: string }>({
  kind: "invite",
  title: "Invite a teammate",
  width: "sm",
  component: InviteSurface,
})
```

---

## Guard unsaved changes

```tsx
function EditorSurface({
  payload,
  resolve,
}: DialogProps<{ text: string }, string>) {
  const { open } = useDialogs()
  const [text, setText] = useState(payload.text)
  const isDirty = text !== payload.text // read during render

  useDialogCloseGuard(async () => {
    if (!isDirty) return true
    return (
      (await open(confirmDialog, {
        title: "Discard changes?",
        description: "Your edits will be lost.",
        confirmLabel: "Discard",
        destructive: true,
      })) === true
    )
  })

  // …
}
```

The guard runs on Escape, outside click and the close button. `resolve()` and
`dismiss()` skip it.

With react-hook-form, read `form.formState.isDirty` during render the same way.

---

## Picker (a working surface)

```tsx
export const customerPickerDialog = defineDialog<void, Customer>({
  kind: "customer-picker",
  title: "Choose a customer",
  width: "3xl",
  height: "tall", // fixed height: the list scrolls, the toolbar and footer stay
  closeOnOutsideClick: false, // a stray click should not lose a selection
  component: CustomerPickerSurface,
})

function CustomerPickerSurface({
  resolve,
  dismiss,
}: DialogProps<void, Customer>) {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Customer | null>(null)
  const { data = [] } = useCustomers(query) // your data hook — providers are shared

  return (
    <>
      <Dialog.Toolbar>
        <Input
          data-autofocus
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </Dialog.Toolbar>
      <Dialog.Body className="p-2">
        {data.map((customer) => (
          <button
            key={customer.id}
            onClick={() => setSelected(customer)}
            onDoubleClick={() => resolve(customer)}
          >
            {customer.name}
          </button>
        ))}
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="outline" onClick={dismiss}>
          Cancel
        </Button>
        <Button
          disabled={!selected}
          onClick={() => selected && resolve(selected)}
        >
          Choose
        </Button>
      </Dialog.Footer>
    </>
  )
}
```

---

## Await a dialog from inside a dialog

Nothing special — the second dialog stacks on top, and the first keeps its state.

```tsx
async function pickColor() {
  const picked = await open(colorPickerDialog, { current: color })
  if (picked) setColor(picked)
}
```

---

## Titlebar buttons

```tsx
<Dialog.TitlebarActions>
  <button type="button" aria-label="Refresh" onClick={refetch}>
    <RefreshCwIcon />
  </button>
</Dialog.TitlebarActions>
```

Render it anywhere in the surface; its children portal into the titlebar.

---

## Async work inside a dialog

Do the work in the surface and resolve when it succeeds, so errors can be shown in place:

```tsx
const mutation = useMutation({ mutationFn: createProject, onSuccess: resolve })

<Button disabled={mutation.isPending} onClick={() => mutation.mutate(values)}>
  Create
</Button>
```

Or resolve with the values and do the work at the call site — pick one per dialog. To
prevent closing while a request is in flight, add a guard:
`useDialogCloseGuard(() => !mutation.isPending)`.

---

## Close everything on navigation

```tsx
const { dismissAll } = useDialogs()
const location = useLocation()

useEffect(() => dismissAll(), [location.pathname, dismissAll])
```

---

## App-wide defaults

A data-entry app with no dragging, no maximize, and no closing on a stray click:

```tsx
<DialogProvider
  defaults={{ draggable: false, maximizable: false, closeOnOutsideClick: false }}
>
```

The one dialog that should still maximize says so itself:

```tsx
defineDialog<void, Report>({
  kind: "report-viewer",
  title: "Report",
  width: "5xl",
  maximizable: true, // wins over the provider's default
  component: ReportSurface,
})
```

---

## Translate the titlebar

```tsx
<DialogProvider labels={{ maximize: t("maximize"), restore: t("restore"), close: t("close") }}>
```

---

## Testing

```tsx
render(
  <DialogProvider exitDuration={0}>
    <FilesPage />
  </DialogProvider>
)

await user.click(screen.getByRole("button", { name: "Rename roadmap.md" }))
const dialog = document.querySelector('[data-kind="rename"]')!
await user.type(
  within(dialog as HTMLElement).getByRole("textbox"),
  "-v2{Enter}"
)
```

- `exitDuration={0}` unmounts closed dialogs synchronously.
- Query frames by `[data-dialog]` or `[data-kind="…"]`. A stacked modal marks the
  layers beneath it `aria-hidden`, which hides them from `getAllByRole("dialog")`.
- To unit-test a surface alone, render it directly with fake props:
  `render(<RenameSurface payload={{ name: "a" }} resolve={resolve} dismiss={dismiss} />)`
  — slots need no provider; `useDialog()` and `useDialogCloseGuard()` do.
