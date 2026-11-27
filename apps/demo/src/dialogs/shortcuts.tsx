import { KeyboardIcon } from "lucide-react"

import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Dialog, defineDialog } from "@/components/x-dialog"

const SHORTCUTS: { keys: string[]; action: string }[] = [
  { keys: ["?"], action: "Show these shortcuts" },
  { keys: ["N"], action: "New product" },
  {
    keys: ["Esc"],
    action: "Close the top dialog (asks first if it has unsaved work)",
  },
  { keys: ["Double-click"], action: "Maximize or restore, on a titlebar" },
  {
    keys: ["←", "→", "↑", "↓"],
    action: "Move a dialog, with its titlebar focused",
  },
]

function ShortcutsSurface() {
  return (
    <Dialog.Body>
      <dl className="flex flex-col divide-y">
        {SHORTCUTS.map((shortcut) => (
          <div
            key={shortcut.action}
            className="flex items-center justify-between gap-6 py-2.5"
          >
            <dt className="text-muted-foreground">{shortcut.action}</dt>
            <dd>
              <KbdGroup>
                {shortcut.keys.map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
              </KbdGroup>
            </dd>
          </div>
        ))}
      </dl>
    </Dialog.Body>
  )
}

/** No payload, no result: `open(shortcutsDialog)` from anywhere, even a key handler. */
export const shortcutsDialog = defineDialog({
  kind: "shortcuts",
  title: "Keyboard shortcuts",
  icon: KeyboardIcon,
  width: "md",
  maximizable: false,
  component: ShortcutsSurface,
})
