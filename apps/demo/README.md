# x-dialog demo

The site at https://abdenourtadjer33.github.io/x-dialog/ — and the place to try a change
to the engine or a frame.

```bash
pnpm dev          # from the repo root
```

It imports the engine (`packages/react/src`) and both registry frames (`registry/`)
straight from source, so edits hot-reload. Switch primitives with the header toggle or
`?primitive=base`.

| Path                             | What it is                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `src/components/use-cases.tsx`   | The use-case list and its code snippets                                      |
| `src/components/back-office.tsx` | The coffee-shop back office the use cases act on                             |
| `src/store/`                     | Its state, a fake server with latency, and the call sites that await dialogs |
| `src/dialogs/`                   | Every dialog in the demo — real-world patterns to copy                       |
| `src/registry-frames.test.tsx`   | The same contract tests, run against the Radix and Base UI frames            |
| `public/llms.txt`                | The API for language models, served next to the site                         |
