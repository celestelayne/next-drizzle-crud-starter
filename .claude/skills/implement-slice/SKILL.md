---
name: implement-slice
description: Implement an approved slice end-to-end — DB schema, data layer, server actions, UI, and tests — following the entity's contract. Use after `new-slice` has produced an approved intent/spec/plan under `docs/slices/<entities>/`. Runs verification and updates the contract to reflect what was implemented. Does not open the PR.
---

# implement-slice

Turn an approved slice contract into working code. Reads the entity's `intent.md`, `spec.md`, and `plan.md`, follows the plan's "Sequence" exactly, runs verification, and updates the contract to mark the verb `implemented`.

## When to trigger

The user asks to implement, build, or ship a planned slice. Phrases like "implement create-film", "build the autosave-film slice", "ship import-films". Trigger only after `new-slice` has produced an approved contract.

## Preconditions

Before touching code:

1. **Contract exists.** `docs/slices/<entities>/{intent,spec,plan}.md` must exist and have no unresolved "Open questions" relevant to the verb being implemented. If any open questions block implementation, stop and surface them.
2. **All three docs are approved.** Each file's frontmatter must have `status: approved` or `status: implemented`. If any doc is still `draft` or `archived`, stop and ask the user to approve (or point them back to `new-slice` for revisions).
3. **Verb is `planned`.** `plan.md`'s "Verbs" table must list the target verb with status `planned`. If `in-progress` or `implemented`, stop and ask the user how to proceed (resume vs re-do).
3. **Not on `main`.** Check branch with `git rev-parse --abbrev-ref HEAD`. If on `main`, stop and ask the user to create a feature branch (per AGENTS.md slice loop step 3).
4. **Working tree clean.** `git status --porcelain` is empty. If not, stop and ask whether to stash or amend.
5. **Database reachable** if the slice touches the DB. Attempt a connection via `prisma db pull --print` or a trivial `db:status`. If unreachable, stop and surface the error.

## Steps

1. Read `AGENTS.md` for architecture guardrails, interface quality, and the "Never" list.
2. Read `docs/slices/<entities>/intent.md`, `spec.md`, and `plan.md` in full.
3. Identify the target slice. If the user named it (e.g. "implement create-film"), use that. Otherwise pick the single `planned` verb from `plan.md`. If multiple are planned, ask which.
4. Mark the verb `in-progress` in `plan.md` so the contract tracks state during work.
5. **Database changes (if any).**
   - Review `plan.md` → "Database changes" and the target verb's row in `spec.md` → "Verbs".
   - If a model, field, or sibling model is being added: edit `prisma/schema.prisma` with the changes.
   - **Stop and ask the user to run** `prisma migrate dev --name <slice>` or confirm before you run it. Show the exact command and the schema diff. Do not run migrations silently.
   - After migration confirmation, run `prisma generate` to update the client.
6. **Dependencies (if any).**
   - Review `plan.md` → "Dependencies to add".
   - **Stop and ask the user to confirm** the install command (e.g. `npm install papaparse` for CSV import). Show exact deps and the command. Do not install silently.
7. **Code sequence.** Follow `plan.md` → "Sequence" in order. For each step, implement the smallest working version first, then edge cases. Typical order for a verb that takes input:
   - Zod schema in `src/features/<entity>/schemas.ts` — one schema per verb that takes input.
   - Data access function in `src/features/<entity>/data.ts` — uses the `db` singleton from `src/db/schema.ts`.
   - Server action in `src/features/<entity>/actions.ts` — calls the data function, returns a serializable result or validation errors.
   - Route(s) under `src/app/<entities>/...` — follow `spec.md` → "Verbs" for the exact route(s).
   - Loading, empty, and error states as called for in `spec.md` → "States" for this verb.
   - Unit tests under `tests/unit/<entity>/` — covering the schema, data function, and action.
   - E2E spec under `tests/e2e/` — happy path, named `<entity>-<verb>.spec.ts`.
8. **Verification.** Run in order and report the actual output of each:
   1. `npm run lint`
   2. `npm run typecheck`
   3. `npm run test:ci`
   4. `npm run test:e2e`
   On any failure, attempt **one** fix pass addressing the root cause. If still failing after the fix pass, stop, revert the `in-progress` → `planned` status, and report the failure truthfully. Do not weaken a test or disable a check to pass.
9. **Walk through `spec.md` → "Done means"** and record how each `AC-N` was verified in `plan.md` → "Acceptance verification" (the test file, manual check, or other evidence per row).
10. **Update the contract.**
    - `spec.md`: fill the verb's row with the final routes, server action name, fields read/written, and states covered. Add any new items to "Done means" discovered during implementation — give each a new `AC-N` ID continuing the numbering; never renumber. Bump `updated` in frontmatter.
    - `plan.md`: mark the verb `implemented`, record "Owner slice" and "Shared files touched", move dependency installs from "Dependencies to add" into "Files to change" rationale, update "Database changes" with the migration name, and fill every row in "Acceptance verification". Bump `updated` in frontmatter.
11. **Validate the contract.** Run `npm run validate:slices` and ensure it exits clean. If it fails, resolve the structural issues before reporting done.
12. Report what was created, what was modified, which checks passed, and point the user at `spec.md` → "Done means" for the final walk-through. Do not create a PR or push — that is slice-loop step 7, user-driven.

## Boundaries

- Implement **only** the current verb. Do not implement future `planned` verbs, even if their files are "obvious" to add alongside.
- Do not change the behavior of a previously `implemented` verb unless the contract explicitly updated its spec row.
- Do not install dependencies, run migrations, or push commits without user confirmation.
- Do not edit `AGENTS.md`, `intent.md`, or another entity's contract. Updates to `spec.md`/`plan.md` are limited to the fields noted in step 10.
- Do not weaken or disable tests to pass verification. If a check fails after one fix pass, stop and report.
- Do not create a PR, push the branch, or merge. The user drives slice-loop steps 7–8.

## Done

- Every file listed in `plan.md` → "Files to add" exists and compiles.
- The verb's row in `plan.md` is marked `implemented` with "Shared files touched" and "Owner slice" filled in.
- `spec.md`'s "Done means" checklist for this verb is accounted for.
- `npm run lint`, `npm run typecheck`, `npm run test:ci`, `npm run test:e2e` all passed on the final run.
- The report back to the user names every file created or modified, the migration name (if any), the deps installed (if any), and the verification results verbatim.
