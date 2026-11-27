import * as React from "react"
import {
  FileTextIcon,
  MoonIcon,
  PencilLineIcon,
  SunIcon,
  Trash2Icon,
} from "lucide-react"

import { Code, CopyButton } from "@/components/code"
import { PromiseLog } from "@/components/promise-log"
import { UseCases } from "@/components/use-cases"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useDialogs } from "@/components/x-dialog"
import { confirmDialog } from "@/dialogs/confirm"
import { renameDialog } from "@/dialogs/rename"
import { PRIMITIVES, usePrimitive, type Primitive } from "@/lib/primitive"
import { usePromiseLog } from "@/lib/promise-log"
import { cn } from "@/lib/utils"

const REPO = "AbdenourTadjer33/x-dialog"
const REPO_URL = `https://github.com/${REPO}`

/* -------------------------------------------------------------------------- */

function GitHubMark(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden {...props}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

function PrimitiveSwitch({ className }: { className?: string }) {
  const { primitive, setPrimitive } = usePrimitive()
  return (
    <ToggleGroup
      aria-label="Dialog primitive"
      variant="outline"
      size="sm"
      value={[primitive]}
      onValueChange={(value: string[]) => {
        const next = value[0] as Primitive | undefined
        if (next) setPrimitive(next)
      }}
      className={className}
    >
      <ToggleGroupItem value="radix">Radix</ToggleGroupItem>
      <ToggleGroupItem value="base">Base UI</ToggleGroupItem>
    </ToggleGroup>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-5">
        <a
          href="#"
          className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight"
        >
          <Logo className="size-6" />
          x-dialog
        </a>
        <nav className="ml-4 hidden items-center gap-5 text-sm text-muted-foreground md:flex">
          <a href="#use-cases" className="hover:text-foreground">
            Use cases
          </a>
          <a href="#install" className="hover:text-foreground">
            Install
          </a>
          <a href="#how" className="hover:text-foreground">
            How it works
          </a>
          <a href="#agents" className="hover:text-foreground">
            For agents
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <PrimitiveSwitch className="hidden sm:flex" />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="x-dialog on GitHub"
            nativeButton={false}
            render={<a href={REPO_URL} />}
          >
            <GitHubMark />
          </Button>
        </div>
      </div>
    </header>
  )
}

export function Logo({ className }: { className?: string }) {
  // a window with a titlebar, holding a resolved promise's check
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect
        x="2.5"
        y="4.5"
        width="27"
        height="23"
        rx="5"
        className="fill-background stroke-foreground"
        strokeWidth="2"
      />
      <path d="M3.5 11h25" className="stroke-foreground" strokeWidth="2" />
      <circle cx="7.5" cy="7.8" r="1.2" className="fill-foreground" />
      <path
        d="m11 19 3.5 3.5L21.5 15"
        fill="none"
        className="stroke-resolved"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* -------------------------------------------------------------------------- */
/* Hero: a tiny real app whose actions are awaited dialogs.                    */
/* -------------------------------------------------------------------------- */

const HERO_CODE = `
async function onRename(file: File) {
  const name = await open(renameDialog, { name: file.name })
  //    ^? string | null
  if (name === null) return // dismissed

  rename(file, name)
}
`

type DemoFile = { id: number; name: string; size: string }

const INITIAL_FILES: DemoFile[] = [
  { id: 1, name: "roadmap.md", size: "4 KB" },
  { id: 2, name: "invoice-0042.pdf", size: "88 KB" },
  { id: 3, name: "launch-notes.txt", size: "2 KB" },
]

function FilesPanel() {
  const { open } = useDialogs()
  const { track } = usePromiseLog()
  const [files, setFiles] = React.useState(INITIAL_FILES)

  async function onRename(file: DemoFile) {
    const name = await track(
      `open(renameDialog, { name: "${file.name}" })`,
      open(renameDialog, { name: file.name })
    )
    if (name === null) return
    setFiles((current) =>
      current.map((f) => (f.id === file.id ? { ...f, name } : f))
    )
  }

  async function onDelete(file: DemoFile) {
    const ok = await track(
      `open(confirmDialog, { title: "Delete ${file.name}?", … })`,
      open(confirmDialog, {
        title: `Delete ${file.name}?`,
        description:
          "This file will be removed from the project. You can't undo this.",
        confirmLabel: "Delete file",
        destructive: true,
      })
    )
    if (ok) setFiles((current) => current.filter((f) => f.id !== file.id))
  }

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <span className="text-sm font-medium">Project files</span>
        {files.length < INITIAL_FILES.length ? (
          <button
            type="button"
            onClick={() => setFiles(INITIAL_FILES)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Restore files
          </button>
        ) : null}
      </div>
      <ul className="divide-y">
        {files.length === 0 ? (
          <li className="px-4 py-6 text-sm text-muted-foreground">
            Every file is gone. Use “Restore files” to bring them back.
          </li>
        ) : null}
        {files.map((file) => (
          <li key={file.id} className="flex items-center gap-3 px-4 py-2.5">
            <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
            <span className="hidden text-xs text-muted-foreground tabular-nums sm:inline">
              {file.size}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Rename ${file.name}`}
              onClick={() => void onRename(file)}
            >
              <PencilLineIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${file.name}`}
              onClick={() => void onDelete(file)}
            >
              <Trash2Icon />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function InstallCommand() {
  const { primitive } = usePrimitive()
  const command = `npx shadcn@latest add ${REPO}/${PRIMITIVES[primitive].item}`
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/60 py-1.5 pr-1.5 pl-3 font-mono text-[13px] ring-1 ring-foreground/5">
      <span className="text-muted-foreground select-none">$</span>
      <span className="min-w-0 flex-1 truncate">{command}</span>
      <CopyButton text={command} />
    </div>
  )
}

function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-5 pt-16 pb-20 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:pt-24">
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-5xl leading-[1.02] font-semibold tracking-tight text-balance sm:text-6xl">
          Dialogs you can <span className="whitespace-nowrap">await.</span>
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
          Declare a dialog once, open it from anywhere, and get a typed result
          back. Drag it, maximize it, stack it, guard it. Rendered with the
          shadcn primitives you already use — Radix or Base UI.
        </p>
        <div className="flex max-w-xl flex-col gap-3">
          <InstallCommand />
          <div className="flex items-center gap-3 sm:hidden">
            <span className="text-sm text-muted-foreground">Primitive</span>
            <PrimitiveSwitch />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="lg"
            nativeButton={false}
            render={<a href="#use-cases" />}
          >
            See the use cases
          </Button>
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            render={<a href={`${REPO_URL}#readme`} />}
          >
            Read the docs
          </Button>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <FilesPanel />
        <Code code={HERO_CODE} />
        <p className="text-sm text-muted-foreground">
          Rename or delete a file above. Each action is one{" "}
          <code className="font-mono text-foreground">await</code>, and the
          promise log in the corner shows what came back.
        </p>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* Install — a real sequence, so it is numbered.                              */
/* -------------------------------------------------------------------------- */

const MOUNT_CODE = `
import { DialogProvider } from "@/components/ui/x-dialog"

export function Providers({ children }: { children: React.ReactNode }) {
  return <DialogProvider>{children}</DialogProvider>
}`

const DEFINE_CODE = `
import { Dialog, defineDialog, type DialogProps } from "@/components/ui/x-dialog"

function RenameSurface({ payload, resolve, dismiss }: DialogProps<{ name: string }, string>) {
  const [name, setName] = useState(payload.name)
  return (
    <>
      <Dialog.Body>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="outline" onClick={dismiss}>Cancel</Button>
        <Button onClick={() => resolve(name)}>Rename</Button>
      </Dialog.Footer>
    </>
  )
}

export const renameDialog = defineDialog<{ name: string }, string>({
  kind: "rename",
  title: (payload) => \`Rename \${payload.name}\`,
  component: RenameSurface,
})`

const OPEN_CODE = `
const { open } = useDialogs()
const name = await open(renameDialog, { name: "roadmap.md" })`

function Install() {
  const { primitive } = usePrimitive()
  const steps = [
    {
      title: "Add the component",
      body: (
        <>
          One command installs{" "}
          <code className="font-mono">components/ui/x-dialog.tsx</code> and the{" "}
          <code className="font-mono">@x-dialog/react</code> engine from npm.
          Pick the primitive your shadcn project uses.
        </>
      ),
      code: null,
    },
    {
      title: "Mount the provider once",
      body: "Near the root, inside your other providers — dialogs share their context.",
      code: MOUNT_CODE,
    },
    {
      title: "Declare a dialog",
      body: "A surface is a plain component. The definition is the handle — no registry to update.",
      code: DEFINE_CODE,
    },
    {
      title: "Await it anywhere",
      body: "The payload is checked and the result is typed. Dismissal is null.",
      code: OPEN_CODE,
    },
  ]

  return (
    <section id="install" className="border-y bg-muted/30">
      <div className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Install
          </h2>
          <PrimitiveSwitch />
        </div>
        <ol className="flex flex-col gap-10">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12"
            >
              <div className="flex gap-4">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground font-mono text-xs text-background">
                  {index + 1}
                </span>
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </div>
              {step.code ? (
                <Code code={step.code} />
              ) : (
                <InstallBlock primitive={primitive} />
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function InstallBlock({ primitive }: { primitive: Primitive }) {
  return (
    <Code
      code={`npx shadcn@latest add ${REPO}/${PRIMITIVES[primitive].item}

# installs: @x-dialog/react, ${PRIMITIVES[primitive].dependency}, lucide-react`}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* How it works                                                               */
/* -------------------------------------------------------------------------- */

function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16">
      <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        Logic you update, markup you own
      </h2>
      <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
        The parts that never change between projects ship as a tested npm
        package. The parts you restyle ship as source, the shadcn way — the same
        split as <code className="font-mono">cmdk</code> and{" "}
        <code className="font-mono">command.tsx</code>.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
        <div className="flex flex-col gap-3 rounded-xl p-5 ring-1 ring-foreground/10">
          <div className="font-mono text-sm">@x-dialog/react</div>
          <p className="text-sm text-muted-foreground">
            npm · versioned · no styles, no primitive
          </p>
          <ul className="mt-1 flex flex-col gap-1.5 text-sm">
            <li>The stack, promises and settling rules</li>
            <li>Close guards, one path for every close</li>
            <li>Drag and maximize geometry</li>
            <li>Payload and result types</li>
          </ul>
        </div>
        <div className="flex items-center justify-center font-mono text-xs text-muted-foreground">
          <span className="hidden md:block">useDialogFrame()</span>
        </div>
        <div className="flex flex-col gap-3 rounded-xl p-5 ring-1 ring-foreground/10">
          <div className="font-mono text-sm">components/ui/x-dialog.tsx</div>
          <p className="text-sm text-muted-foreground">
            shadcn registry · your file · Radix or Base UI
          </p>
          <ul className="mt-1 flex flex-col gap-1.5 text-sm">
            <li>Overlay, titlebar, buttons and icons</li>
            <li>Body, toolbar and footer slots</li>
            <li>Width and height classes</li>
            <li>Labels for i18n</li>
          </ul>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* For agents                                                                 */
/* -------------------------------------------------------------------------- */

const TYPES_CODE = `
await open(renameDialog)
// ✗ Expected 2 arguments, but got 1.

await open(renameDialog, { title: "a.md" })
// ✗ Object literal may only specify known properties.

const name = await open(renameDialog, { name: "a.md" })
// ✓ name: string | null`

function ForAgents() {
  return (
    <section id="agents" className="border-t">
      <div className="mx-auto grid max-w-6xl scroll-mt-20 grid-cols-1 gap-10 px-5 py-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
        <div className="flex flex-col gap-4">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Easy for agents to get right
          </h2>
          <p className="leading-relaxed text-muted-foreground">
            A dialog is one definition and one surface, and the compiler checks
            every call site. When an agent gets the payload wrong, the error
            names the field.
          </p>
          <ul className="flex flex-col gap-3 text-sm leading-relaxed">
            <li>
              <span className="font-medium">An Agent Skill.</span>{" "}
              <code className="font-mono text-xs">
                npx shadcn@latest add {REPO}/x-dialog-skill
              </code>{" "}
              teaches Claude Code and other agents the patterns and the rules.
            </li>
            <li>
              <span className="font-medium">llms.txt.</span> The whole API on
              one page, written for models — served next to this site.
            </li>
            <li>
              <span className="font-medium">One import path.</span> Everything
              comes from{" "}
              <code className="font-mono text-xs">
                @/components/ui/x-dialog
              </code>
              , so there is nothing to guess.
            </li>
          </ul>
        </div>
        <Code code={TYPES_CODE} copyable={false} />
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */

export function App() {
  return (
    <div className="min-h-svh">
      <a
        href="#use-cases"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2"
      >
        Skip to use cases
      </a>
      <Header />
      <main>
        <Hero />
        <UseCases />
        <Install />
        <HowItWorks />
        <ForAgents />
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-8 text-sm text-muted-foreground">
          <span>MIT licensed</span>
          <a href={REPO_URL} className="hover:text-foreground">
            GitHub
          </a>
          <a
            href="https://www.npmjs.com/package/@x-dialog/react"
            className="hover:text-foreground"
          >
            npm
          </a>
          <a href="./llms.txt" className="hover:text-foreground">
            llms.txt
          </a>
          <span className={cn("ml-auto")}>Made by Abdenour Tadjer</span>
        </div>
      </footer>
      <PromiseLog />
    </div>
  )
}

export default App
