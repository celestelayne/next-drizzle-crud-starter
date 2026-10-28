---
name: new-slice
description: Draft or update the per-entity contract — intent, spec, plan — before any code is written for a new slice. Use when the user wants to start, scope, or plan a slice (e.g. "plan create-film", "new slice for autosave-film", "scope import-films"). Reads AGENTS.md and the existing entity contract to flag shared-file coupling. Writes no source code.
---

# new-slice

Produce the per-entity contract that governs a slice. The output is three living files under `docs/slices/<entities>/` — one folder per entity, with the entity's name pluralized (e.g. `docs/slices/films/`). No code, no migrations, no dependency changes.

## When to trigger

The user asks to start, scope, or plan a slice. Phrases like "new slice for create-film", "let's spec autosave-film", "plan the import-films slice".

## Steps

1. Read `AGENTS.md` for project rules, slice loop, and architecture guardrails.
2. Parse the user's slice intent into `<verb>` and `<entity>` (singular). Supported verbs out of the gate: `create`, `edit`, `delete`, `show`, `list`, `autosave`, `recover`, `import`, `export`. If the slice doesn't fit one of these, raise it as an open question in `plan.md` and continue.
3. Derive the entity folder name (plural). Example: `create-film` → entity `film`, folder `docs/slices/films/`.
4. Check whether `docs/slices/<entities>/` exists.
   - **First slice for this entity:** draft all three files — `intent.md`, `spec.md`, `plan.md` — by splitting `.claude/skills/new-slice/contract-template.md` on its `<!-- FILE: name -->` markers. The content between a marker and the next marker (or EOF) is the body of the named file. Fill each section from the user's description. Set `status: draft` in each file's frontmatter and `updated` to today's date (YYYY-MM-DD). Give each `Done means` item a unique `AC-N:` ID in order (`AC-1`, `AC-2`, …) and mirror those IDs into `plan.md`'s "Acceptance verification" table. Mark the current verb as `planned` in `plan.md`'s Verbs table.
   - **Existing entity:** read all three files. Draft updates only — append the new verb's rows to `spec.md`'s "Verbs" table and new `AC-N:` items to "Done means" (continue numbering; never renumber or reuse an ID), mirror the new ACs into `plan.md`'s "Acceptance verification", and append rows to `plan.md`'s "Verbs" table and "Shared-file changes". Bump each touched file's `updated` date in frontmatter. Do not rewrite sections that aren't changing.
5. For anything unknown, write a bullet under that file's "Open questions" rather than guessing. Prefer an "Open question" over a silent assumption.
6. In `plan.md` → "Shared-file changes", enumerate every file outside `docs/slices/<entities>/` the slice will touch, and cross-reference any other entity contract that also touches those files. Shared files to watch in this template: `prisma/schema.prisma`, `src/db/schema.ts`, `src/features/<entity>/*`, `src/app/<entities>/**`, `tests/unit/<entity>/*`, `tests/e2e/*`, `playwright.config.ts`, `vitest.config.mts`.
7. If this slice adds a new Prisma model or column, record it in `plan.md` → "Database changes". The first slice for an entity owns the model addition and the migration; later slices for the same entity do not re-add the model.
8. **Stop.** Hand back to the user for review before any further action. Say explicitly: "Contract drafted — review `docs/slices/<entities>/{intent,spec,plan}.md`. I won't touch code until you sign off."

## Boundaries

- No source code, no tests, no Prisma schema edits, no migrations, no dependency installs.
- Do not edit `AGENTS.md`, other entity contracts, or anything under `src/`, `prisma/`, `tests/`, `.github/`.
- If the slice needs a new library (e.g. a CSV parser for `import-films`), add it to `plan.md` → "Dependencies to add" as an open question — don't install it.
- If the user asks you to also implement, decline and point them at the finished contract for a separate build step.
- Never claim a slice is "done" from this skill — this skill only produces the contract.

## Done

The three files exist under `docs/slices/<entities>/`, every section has either an answer or an "Open question" bullet, shared-file coupling is enumerated, the new verb is marked "planned" (not "implemented"), and the user has signed off.
