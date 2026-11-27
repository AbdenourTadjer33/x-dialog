# Contributing

Thanks for helping. Bug reports with a reproduction, focused pull requests and docs fixes
are all welcome.

## Setup

Requires Node 20+ and pnpm (the version is pinned in `package.json`; `corepack enable`
picks it up).

```bash
pnpm install
pnpm dev     # demo site with the engine and both frames, hot-reloading
```

[AGENTS.md](./AGENTS.md) describes the layout of the repository and the rules for changes;
it is written for AI agents but is the best map for humans too.

## Before you open a pull request

```bash
pnpm check
```

runs formatting, lint, typecheck, all tests, the builds and the package checks — the same
as CI. Then:

- Add a test for behaviour changes, and a type test for inference changes.
- If you change a frame, make the same change to the other one, and try both in the demo.
- Run `pnpm changeset` and describe the change for the changelog (skip it for docs or demo
  only changes).

## Reporting a bug

Include the primitive (Radix or Base UI), React version, and the smallest code that shows
the problem. A fork of the demo is ideal.
