// Fans the built registry out per shadcn style, so one command fits every project:
//
//   npx shadcn@latest add @x-dialog/x-dialog
//
// The @x-dialog namespace resolves to `<site>/r/{style}/{name}.json`, and the CLI
// fills {style} from the project's components.json ("radix-nova", "base-vega",
// "new-york", ...). The frame depends on the primitive, not on the visual preset,
// so every radix-* style gets the Radix frame and every base-* style the Base UI one.
//
// Run after `shadcn build` (see `pnpm registry:build`).

import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

const OUT = path.resolve(import.meta.dirname, "../apps/demo/public/r")

// The presets known to shadcn 4.x (`components.json` style = `<base>-<preset>`).
const PRESETS = ["nova", "vega", "maia", "lyra", "mira", "luma", "sera", "rhea"]
// Pre-4.x projects use these style names; they are all Radix.
const LEGACY_RADIX_STYLES = ["new-york", "new-york-v4", "default"]

const STYLES = {
  radix: [
    ...PRESETS.map((preset) => `radix-${preset}`),
    ...LEGACY_RADIX_STYLES,
  ],
  base: PRESETS.map((preset) => `base-${preset}`),
  // React Aria ("aria-*") has no frame yet, so those styles are left out on
  // purpose: the CLI reports "not found" instead of installing the wrong one.
}

async function readItem(name) {
  return JSON.parse(await readFile(path.join(OUT, `${name}.json`), "utf8"))
}

const items = {
  radix: await readItem("x-dialog-radix"),
  base: await readItem("x-dialog-base"),
  skill: await readItem("x-dialog-skill"),
}

let written = 0
for (const [primitive, styles] of Object.entries(STYLES)) {
  const frame = items[primitive]
  const files = {
    // the short name picks the frame that matches the project
    "x-dialog": { ...frame, name: "x-dialog", title: "x-dialog" },
    // explicit names keep working through the namespace too
    "x-dialog-radix": items.radix,
    "x-dialog-base": items.base,
    "x-dialog-skill": items.skill,
  }

  for (const style of styles) {
    const dir = path.join(OUT, style)
    await mkdir(dir, { recursive: true })
    for (const [name, item] of Object.entries(files)) {
      await writeFile(
        path.join(dir, `${name}.json`),
        `${JSON.stringify(item, null, 2)}\n`
      )
      written += 1
    }
  }
}

const styleCount = Object.values(STYLES).flat().length
console.log(
  `✔ Wrote ${written} items for ${styleCount} styles to ${path.relative(process.cwd(), OUT)}/<style>/`
)
