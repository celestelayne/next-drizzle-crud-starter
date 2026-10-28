# Conventions

Architectural rules that this template commits to from day one. Each file follows the same shape — a rule, why it exists, what it looks like in code, how it gets violated, and when it bends.

The one-line form of each rule is in [`AGENTS.md`](../../AGENTS.md) → "Architecture guardrails". These docs are the deep version — load them when a slice is making decisions in the area, when a reviewer is auditing one of these concerns, or when the rule needs to be questioned.

## Index

| Topic | Rule in one line |
| ----- | ---------------- |
| [data-ownership.md](data-ownership.md) | UI never touches Prisma directly. All DB access flows UI → action → data function → `db`. |
| [state-management.md](state-management.md) | Each piece of state has one owner; the owner is chosen by who needs to observe the state. |

## When to add a new convention

A new file earns its place here when:

1. A rule has been corrected twice during review (see AGENTS.md → "Learned rules").
2. A decision is non-obvious enough that it needs rationale, not just a rule.
3. Multiple slices make the same decision and it's worth standardizing.

Avoid turning a one-off preference into a permanent convention. Prefer AGENTS.md's dated learned-rules section for anything still earning its weight.

## Conflict resolution

If a convention here conflicts with AGENTS.md, AGENTS.md wins and the convention is updated. If a convention conflicts with a slice's `plan.md`, stop and surface the conflict — don't silently reinterpret either.
