<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# About

A Next.js + Prisma CRUD starter template. Postgres via `@prisma/adapter-pg`. Server actions for mutations, Zod for boundary validation, Vitest for unit tests, Playwright for E2E.

Build applications incrementally through vertical slices. Each slice introduces one complete user capability (one verb on one entity) without implementing future slices prematurely.

## Planning a slice

Every slice starts with a contract. Invoke the `new-slice` skill before writing code — phrasings like `plan create-film`, `new slice for edit-film`, `scope autosave-film` all route to it.

The skill drafts or updates the per-entity contract at `docs/slices/<entities>/{intent,spec,plan}.md`, then stops for your review. It writes no source code.

Supported verbs out of the gate: `create`, `edit`, `delete`, `show`, `list`, `autosave`, `recover`, `import`, `export`. Other verbs are fine — the skill will raise them as an open question in `plan.md`.

## Implementing a slice

Once the contract is approved and you're on a feature branch, invoke the `implement-slice` skill — phrasings like `implement create-film`, `build the autosave-film slice`, `ship import-films`.

The skill reads `intent.md` / `spec.md` / `plan.md`, follows the plan's "Sequence", asks before running `prisma migrate dev` or `npm install`, runs lint/typecheck/unit/e2e verification, and updates the contract to mark the verb `implemented`. It does not open the PR — that's your step.

## Slice loop

Repeat for every slice:

```
Plan → Approve → Implement → Verify → Review → Merge → Repeat
```

1. Invoke the `new-slice` skill (e.g. "plan create-film") to draft or update `docs/slices/<entities>/{intent,spec,plan}.md`.
2. Review and approve the contract before implementation.
3. Create a feature branch.
4. Invoke the `implement-slice` skill (e.g. "implement create-film") to turn the approved contract into working code, tests, and verification.
5. Run automated checks and inspect the interface.
6. Review the result against `spec.md` → "Done means".
7. Open a pull request, get required checks green.
8. Merge after approval. Start the next slice only after the current one is merged.

Do not treat a passing test suite as proof that the interface meets its specification.

If code and contract disagree, stop and ask. Never silently reinterpret the contract or build ahead.

## Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test            # Vitest in watch mode
npm run test:ci         # Vitest one-shot
npm run test:e2e        # Playwright headless
npm run test:e2e:ui     # Playwright UI mode
npm run db:generate     # Prisma client
npm run db:migrate      # Create + apply a dev migration
npm run db:deploy       # Apply pending migrations (CI/prod)
npm run db:status       # Show migration state
npm run db:studio       # Prisma Studio
```

If a script does not exist, report that. Do not silently add a new tool or dependency to make it exist.

## Where things live

```text
next-drizzle-crud-starter/
├── AGENTS.md
├── CLAUDE.md                       # optional, per-project Claude Code context
├── docs/
│   └── slices/
│       └── <entities>/             # per-entity contract (plural folder)
│           ├── intent.md
│           ├── spec.md
│           └── plan.md
├── .claude/
│   └── skills/
│       ├── new-slice/              # drafts the per-entity contract
│       │   ├── SKILL.md
│       │   └── contract-template.md
│       └── implement-slice/        # turns an approved contract into code
│           └── SKILL.md
├── prisma/
│   ├── schema.prisma
│   └── migrations/                 # created by `prisma migrate dev`
├── prisma7.config.ts
├── src/
│   ├── app/                        # Next.js App Router — routes/UI
│   │   └── <entities>/             # one folder per entity's routes
│   ├── db/
│   │   └── schema.ts               # Prisma client singleton
│   ├── features/                   # created by the first slice per entity
│   │   └── <entity>/
│   │       ├── schemas.ts          # Zod schemas (one per verb that takes input)
│   │       ├── data.ts             # Prisma queries
│   │       └── actions.ts          # server actions
│   └── generated/
│       └── prisma/                 # generated client (gitignored)
├── tests/
│   ├── unit/
│   │   └── <entity>/               # Vitest tests per entity
│   └── e2e/                        # Playwright specs
├── playwright.config.ts
├── vitest.config.mts
└── .github/workflows/ci.yml
```

Create files and folders only when a slice needs them. The structure above is where things *will* live as the app grows, not what to scaffold upfront.

## Architecture guardrails

1. **Data access through the data layer only.** Server actions and route handlers call functions in `src/features/<entity>/data.ts`. UI code never imports from `@prisma/client` directly.
2. **Zod at every input boundary.** Form data, URL params, cookies, and CSV import rows are validated with Zod before reaching the data layer. The data layer trusts its inputs.
3. **Server actions are the write boundary.** All mutations go through server actions in `src/features/<entity>/actions.ts`. Reserve `route.ts` route handlers for non-form contracts (CSV export streaming, webhooks).
4. **One Prisma client.** `src/db/schema.ts` is the single source for the `db` instance. Every data function imports from there — never `new PrismaClient()` elsewhere.
5. **Server-only guard.** `src/db/schema.ts` imports `server-only`. Keep secrets and DB access behind that guard; a client-component import of a module that transitively hits `server-only` will fail the build.
6. **Explicit state ownership.**
   - Form input: React component state (progressive enhancement via server actions).
   - List filters, sort, pagination: URL query params (`?q=`, `?sort=`, `?page=`), with safe fallbacks on invalid values.
   - User preferences across sessions: cookies via `next/headers`.
   - Autosave drafts: DB-backed sibling model (e.g. `FilmDraft`), introduced by the entity's `autosave-<entity>` slice.
7. **Migrations are versioned.** Every schema change goes through `prisma migrate dev --name <descriptive_name>`. Never edit a committed migration file; create a new one.
8. **No premature abstractions.** Prefer straightforward components and functions. Extract reusable abstractions only after genuine repetition or a clear architectural need.
9. **Validate at external boundaries, fall back on failure.** Invalid URL params fall back to a safe default (e.g. `?sort=invalid` → use the default sort). Invalid form data renders inline errors — don't crash the route. Corrupted import rows report per-row errors; the batch continues.
10. **No unnecessary dependencies.** Use Next.js, React, Prisma, Zod, and existing tooling unless a new dependency solves a demonstrated problem and is approved. New libraries are tracked in `plan.md` → "Dependencies to add".
11. **Tests at both levels.** Vitest covers Zod schemas, data-layer functions, and server actions. Playwright covers the happy path for each verb's UI.

## Interface quality

Every slice must meet the applicable criteria before it is considered done:

1. Contrast is at least WCAG AA (4.5:1 body text, 3:1 UI and large text).
2. Every interactive element is reachable by keyboard with a visible focus ring.
3. Hit targets are at least 44×44 CSS pixels on touch.
4. Motion respects `prefers-reduced-motion` and defaults to a single duration + easing.
5. Empty, loading, and error states are designed, not accidents. Server components render error.tsx for route errors; `useFormState` renders inline validation.
6. Layout works from 320px up. No horizontal scroll on mobile.
7. Color is never the only signal (pair with icon, text, or shape).

## Verifying your work

Before declaring that a slice is done:

1. Run `npm run lint`, `npm run typecheck`, `npm run test:ci`, `npm run test:e2e`. Report actual results. Never claim a check passed unless it ran successfully.
2. Open the app and inspect the changed interface at mobile (320px) and desktop widths, across every verb implemented so far.
3. Verify keyboard interaction and visible focus behavior.
4. Walk through every item in the slice's `spec.md` → "Done means" and explain how it was checked.
5. Test edge cases: empty results, invalid URL params, invalid form input, DB constraint violations, concurrent edits, corrupted import rows.
6. Check that previously-implemented verbs on this and other entities still behave correctly.
7. Report any checks that could not be run, and why.

## Never

- Read `.env` files or expose secrets.
- Edit or weaken a test solely to make it pass.
- Add a library without asking.
- Import `@prisma/client` or `db` from a client component.
- Hard-code a connection string or secret.
- Skip or edit a committed migration — always create a new one.
- Use `useEffect` where a server action or server component would do.
- Introduce a global state library for state the URL, cookies, or React can handle.
- Implement a future slice before approval.
- Change another slice's behavior without identifying the impact and getting approval.
- Claim unrun tests or manual checks passed.

## When Claude gets something wrong twice

When the same correction comes up twice in review, add a dated rule below:

```
YYYY-MM-DD — rule
```

Only add rules supported by repeated, observed problems. Avoid turning one-off preferences into permanent architecture constraints.

The guardrails above describe established project decisions. This section is where new rules earn their place.

### Learned rules

<!-- Add dated rules here as repeated issues are identified. -->
