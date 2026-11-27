# AGENTS.md

Guidance for AI agents (and humans) working **on** this repository. To _use_ x-dialog in
an app, read [`skills/x-dialog/SKILL.md`](./skills/x-dialog/SKILL.md) or
[`llms.txt`](./apps/demo/public/llms.txt) instead.

## What this is

Promise-based dialogs for React, shipped in two halves:

| Path                          | Ships as                     | Contains                                                          |
| ----------------------------- | ---------------------------- | ----------------------------------------------------------------- |
| `packages/react`              | npm `@x-dialog/react`        | The engine: stack, promises, guards, geometry, types. No styles.  |
| `registry/radix/x-dialog.tsx` | shadcn item `x-dialog-radix` | The frame on Radix. Copied into user projects.                    |
| `registry/base/x-dialog.tsx`  | shadcn item `x-dialog-base`  | The same frame on Base UI.                                        |
| `skills/x-dialog/SKILL.md`    | shadcn item `x-dialog-skill` | Agent skill for consumers.                                        |
| `apps/demo`                   | GitHub Pages                 | Demo site. Imports the registry files and the engine from source. |
| `docs/`                       | —                            | API reference and recipes.                                        |

## Commands

```bash
pnpm install
pnpm dev                 # demo at http://localhost:5173, hot-reloads engine + registry
pnpm test                # engine tests (+ type tests) and registry frame tests (both primitives)
pnpm typecheck
pnpm lint
pnpm format              # prettier, incl. tailwind class sorting
pnpm registry:validate   # shadcn registry schema check
pnpm check               # everything CI runs
```

## Rules for changes

- **Engine stays headless.** Nothing in `packages/react` imports a UI library, a CSS
  class or an icon. If a change needs markup, it belongs in the frames.
- **Both frames move together.** `registry/radix/x-dialog.tsx` and
  `registry/base/x-dialog.tsx` share markup and classes; only the primitive wiring
  differs. Change one, change the other, and keep them diff-able.
- **Every close goes through the engine.** Frames keep the primitive controlled by
  `frame.open` and report Escape / outside presses via `frame.handleEscapeKey()` /
  `frame.handleOutsidePress(target)`. Never let a primitive close itself — that bypasses
  close guards.
- **Registry files use only stable shadcn imports**: `@/lib/utils` (`cn`), `lucide-react`,
  the primitive, and `@x-dialog/react`. No `@/components/ui/*` — user projects may have
  older versions of those components.
- **Tailwind v4 classes, no shadcn-only variants.** Use `data-[state=open]:` (Radix) and
  `data-[open]:` (Base UI), not `data-open:`, which needs `shadcn/tailwind.css`.
- **Public API changes need**: a type test in `packages/react/src/__tests__/types.test-d.ts`
  when inference is involved, docs in `docs/api.md`, `llms.txt` and `SKILL.md`, and a
  changeset (`pnpm changeset`).
- **Behaviour changes need a test** in `packages/react/src/__tests__/dialog.test.tsx`
  (engine, against the plain `TestFrame`) and, if they touch primitive wiring,
  `apps/demo/src/registry-frames.test.tsx` (runs against both frames).
- The engine is built with `isolatedDeclarations`: exported functions need explicit
  return types.
- Code style: Prettier (no semicolons, double quotes, 2 spaces). Comments explain _why_.

## Verifying UI changes

jsdom cannot check layout, focus restoration or animations. For frame changes, run
`pnpm dev` and check both primitives (header toggle or `?primitive=base`): open a stacked
dialog, press Escape twice, click outside, drag, maximize/restore, and confirm focus
returns to the opener.
