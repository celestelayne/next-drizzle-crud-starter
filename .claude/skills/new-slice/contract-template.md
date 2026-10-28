# Contract template

Per-entity contract. Three sections, one per output file under `docs/slices/<entities>/`. Copy each between its `---` markers into the matching file. Keep answers short. Prefer an "Open question" over a guess.

The entity folder name is the entity pluralized (e.g. `docs/slices/films/`). The three files grow over time: `intent.md` is near-stable, `spec.md` grows as verbs land, `plan.md` is updated per slice.

---
# intent.md

## Entity
`<Entity>` (PascalCase, singular). Example: `Film`.

## User jobs
One or two sentences, from the user's point of view, naming what this entity lets them do. If it doesn't fit, the entity is doing too much — split it.

## Entry points
Where the user reaches this entity. Which route, which link, which action. Example: `/films`, `/films/new`, `/films/[id]`.

## What success looks like
Two or three observable outcomes across the lifecycle of this entity. No "fast", "clean", or other unmeasurables.

## Out of scope
What this entity deliberately does not do. Call out capabilities that belong on a different entity or a future slice. If something is in scope but not yet built, that belongs in `plan.md`'s verbs table, not here.

## Open questions
- 
---
# spec.md

## Entity
`<Entity>`.

## Data model
The Prisma shape of this entity. One line per field: name, type, required/optional, constraint, default. Note relationships separately.

| Field | Type | Required | Constraint | Default |
| ----- | ---- | -------- | ---------- | ------- |

**Relationships:** _(e.g. `director` → `Director` many-to-one, nullable; `tags` → `Tag[]` many-to-many)_

**Derived values:** _(computed in queries or views, not stored)_

## Validation
How each field is validated at boundaries. The data layer trusts Prisma; everything crossing in from forms, URL, or imports goes through Zod.

- Form input: `src/features/<entity>/schemas.ts` — one schema per verb that takes input.
- URL params: validated where they're read (e.g. the list route's `?sort=` and `?q=`), with safe fallbacks on invalid values. Never crash on bad input.
- CSV import: row-level schema that rejects invalid rows with a per-row error, not a whole-batch failure.

## Verbs
One row per verb this entity supports. Add a row when a verb is planned; don't pre-populate verbs the entity may never need. Status is `planned`, `in-progress`, or `implemented`. "Slice" is the slice name that owned/owns that verb.

| Verb | Status | Slice | Route(s) | Server action | Reads fields | Writes fields |
| ---- | ------ | ----- | -------- | ------------- | ------------ | ------------- |

## States
Each verb's UI must cover these states. If a state is impossible for the verb, mark N/A.

| Verb | Loading | Empty | Error | Success |
| ---- | ------- | ----- | ----- | ------- |

## Failure
What counts as a bad input or unhappy state, and what this entity does about it. Cover at minimum: invalid form input, missing record (404), concurrent edit (stale draft), DB constraint violation (unique, FK), corrupted import row. For URL params, fall back to a safe default — don't crash the route.

## Done means
Checklist. Every item is something a human or test can verify in one pass. Keep adding items as verbs land.

- [ ] 
- [ ] 

## Open questions
- 
---
# plan.md

## Entity
`<Entity>`.

## Verbs
Mirror of `spec.md`'s verbs table, from the implementation angle. "Owner slice" is the slice that introduced this verb. "Shared files touched" lists files outside `docs/slices/<entities>/` the verb modified.

| Verb      | Status | Owner slice | Shared files touched |
| --------- | ------ | ----------- | -------------------- |

## Files to add
Path and one-line purpose. Grouped by slice.

### Slice: `<verb>-<entity>`
- `src/features/<entity>/schemas.ts` — Zod schemas for this entity.
- `src/features/<entity>/data.ts` — Prisma queries.
- `src/features/<entity>/actions.ts` — server actions.
- `src/app/<entities>/...` — route(s) for this verb.
- `tests/unit/<entity>/<verb>.test.ts`
- `tests/e2e/<entity>-<verb>.spec.ts`

## Files to change
Path, one-line reason, and the owner slice (if any) that currently owns that file.

## Shared-file changes
Every file outside `docs/slices/<entities>/` this slice will touch, with cross-reference to any other entity contract that also touches those files. Flag conflicts here before building.

| File | This slice does | Other entities also here | Risk |
| ---- | --------------- | ------------------------ | ---- |

Watch especially: `prisma/schema.prisma`, `src/db/schema.ts`, `tests/e2e/*`, `playwright.config.ts`, `vitest.config.mts`.

## Database changes
What this slice adds to the schema. The first slice for an entity owns the model and the migration. Later slices only add fields, indexes, or sibling models (e.g. `FilmDraft` for `autosave-film`).

- Model: `<Entity>` — _added by slice `<name>`, migration `<name>`_
- Fields: _added/removed in this slice_
- Indexes: _added in this slice_
- Sibling models: _e.g._ `FilmDraft` _for autosave_

## Dependencies to add
Any library this slice needs that isn't already installed. Each is an open question until approved — the skill does not install.

- 

## Sequence
Build order for the current slice. Thin first; a running UI before a correct one. For a `create-<entity>` first slice, a reasonable sequence is:

1. Add model + migration (if first slice for entity).
2. Zod schema for the create input.
3. Data access function.
4. Server action calling the data function.
5. Route rendering a basic form posting to the action.
6. Wire validation errors into the form.
7. Unit test for the action and the schema.
8. E2E smoke covering the happy path.

Adjust per verb.

## Open questions
- 
---
