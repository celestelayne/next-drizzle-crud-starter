---
name: review-slice
description: Review an implemented slice against its approved contract. Static code review — reads the diff and the entity contract, classifies spec coverage, flags data-loss and safety risks, and notes interface-quality items needing manual verification. Reports findings; does not change code or the contract. Use after `implement-slice` has finished and before opening the PR.
---

# review-slice

Compare the slice's actual implementation to its approved contract and surface gaps. Adopts a reviewer's bias — find missing failure states, concurrent-edit races, missed data-loss risks, and spec/code mismatches. Does not confirm success; names what's unfinished or risky.

Static review only — reads code and contract, does not run the app. The user still owns manual verification per AGENTS.md "Verifying your work".

## When to trigger

The user asks to review, audit, or check an implemented slice before merge. Phrases like "review create-film", "audit the autosave-film slice", "check import-films against the spec".

Pass `--persist` in the invocation to also write the report to `docs/slices/<entities>/review-<verb>.md`. Without `--persist`, output is chat-only.

## Preconditions

1. **Contract exists.** `docs/slices/<entities>/{intent,spec,plan}.md` must be present.
2. **Verb is `implemented`.** The target verb's row in `plan.md` must be marked `implemented`. If still `planned` or `in-progress`, stop and point the user at `implement-slice`.
3. **Branch has a diff against the base.** `git diff <base-branch>...HEAD --name-only` must list the files from `plan.md` → "Files to add" / "Files to change". If none, stop and report that no slice work is present on this branch.

## Steps

1. Read `AGENTS.md` — focus on "Architecture guardrails", "Interface quality", "Never".
2. Read `docs/slices/<entities>/intent.md`, `spec.md`, and `plan.md` in full. Identify the target verb (named by the user, or the single `implemented` verb with the most recent slice-loop activity).
3. Collect the diff. For each file in `plan.md` → "Files to add" / "Files to change", read it. For the full picture, also run `git diff <base-branch>...HEAD` for files not listed in the plan — those are off-contract changes and get flagged.
4. **Spec coverage.** Walk each row/item below. Classify as `pass` (code evidences the behavior), `needs-attention` (partial / ambiguous), or `missing` (not implemented).
   - `spec.md` → "User-visible behavior" (every numbered step).
   - `spec.md` → "Done means" checklist.
   - `spec.md` → "States" row for this verb (loading, empty, error, success — each state cell).
   - `spec.md` → "Failure" items — every stated failure mode has handling.
   - `spec.md` → "Validation" — Zod schemas exist for every input boundary stated.
5. **Data-loss & safety risks.** Check for each; flag `risk` severity if present, `pass` if demonstrably absent, `needs-attention` if unclear:
   - **Destructive ops without confirmation.** `delete-*` slices without a confirmation UI step.
   - **Unbounded destructive ops.** Bulk delete / mass update server actions with no cap or dry-run.
   - **Concurrent-edit races.** `edit-*` or `autosave-*` slices without stale-record detection (e.g. `updatedAt` check or optimistic lock).
   - **Autosave draft lifecycle.** Autosave drafts not deleted after successful commit; stale drafts not surfaced by `recover-*`; same user has colliding drafts.
   - **Migration safety.** `prisma/migrations/*` adding `NOT NULL` without a default on an existing table; dropping a column with existing data; renaming without a `--create-only` + manual edit path.
   - **Server-action exposure.** Server actions callable without the project's auth guard (if one exists); server actions accepting `FormData` without Zod validation.
   - **Streaming / memory.** `export-*` slices that `findMany` the whole table into memory instead of streaming via cursor.
   - **URL-param crashes.** List/show slices that throw on invalid `?sort=`, `?page=`, `?id=` instead of falling back to a default or 404.
   - **Secrets in code or committed env.** `.env` modifications in the diff; hard-coded connection strings or API keys.
   - **Client components importing server-only code.** A `"use client"` file transitively importing `src/db/schema.ts` or `src/features/<entity>/data.ts`.
6. **Interface quality (code-visible evidence only).** For each AGENTS.md "Interface quality" item, note whether the code demonstrates it, is silent on it (needs manual verification), or appears to violate it:
   - Contrast (hard to verify statically — mark as `manual-check`).
   - Keyboard reachable + visible focus (check for `tabIndex`, `aria-*`, `focus:` classes).
   - Hit targets 44×44 (`manual-check`).
   - `prefers-reduced-motion` (check for `motion-safe:` / `motion-reduce:` or JS `matchMedia`).
   - Empty/loading/error states designed (check for `loading.tsx`, `error.tsx`, inline-error rendering, empty-state components).
   - Mobile layout from 320px (`manual-check`).
   - Color not sole signal (`manual-check` unless an obviously color-only indicator is in the diff).
7. **Off-contract changes.** List any files in the diff that are not in `plan.md` → "Files to add" / "Files to change" / "Shared-file changes". Flag as `needs-attention` — either the plan is incomplete, or the slice overreached.
8. **Report.** Emit a markdown report with this exact structure:

   ```
   # Review: <slice-name>

   ## Summary
   - risks: <count>
   - needs-attention: <count>
   - pass: <count>
   - manual-check: <count>

   ## Spec coverage
   <findings, grouped: User-visible behavior | Done means | States | Failure | Validation>

   ## Data-loss & safety
   <findings>

   ## Interface quality
   <findings, including manual-check items>

   ## Off-contract changes
   <files not in plan.md, or "none">

   ## Suggested next steps
   <ordered list of fixes before merge>
   ```

   Each finding has a severity tag, a one-line observation, a file:line pointer when applicable, and a "Suggested fix" line.

9. **If `--persist` was passed**, also write the report to `docs/slices/<entities>/review-<verb>.md`.
10. **Stop.** Hand control back to the user. Say explicitly: "Review complete — <N> risks, <N> needs-attention. See findings above. I will not change code or the contract."

## Severity levels

- **`risk`** — must be fixed before merge. Data-loss, security, concurrency, or broken contract items.
- **`needs-attention`** — should be fixed or explicitly accepted. Partial spec coverage, ambiguous handling, off-contract changes.
- **`manual-check`** — code can't tell; user must verify manually (visual A11y, mobile layout).
- **`pass`** — code evidences the behavior.

## Boundaries

- No code changes. No test changes. No contract edits.
- No PR actions — no `gh pr create`, no comment posting, no merge.
- Does not re-run verification (`implement-slice` already did that). If the user wants fresh results, they run `npm run test:ci` / `test:e2e` themselves.
- Does not update AGENTS.md's "Learned rules". That section is populated manually when the same correction recurs across reviews.
- Does not confirm success. If every finding is `pass`, the report still names what the user needs to manually verify.

## Done

- The report has been emitted in chat with every section populated (even if "none" for off-contract changes).
- If `--persist`, `docs/slices/<entities>/review-<verb>.md` exists with the same report.
- Severity counts in the summary are accurate.
- The user has clear next steps if any `risk` or `needs-attention` findings exist.
