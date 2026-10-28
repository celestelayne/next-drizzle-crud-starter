# State management

## The rule

Each piece of state has exactly one owner. The owner is determined by who needs to observe the state:

| What needs to observe it                | Owner              | Example                                       |
| --------------------------------------- | ------------------ | --------------------------------------------- |
| One interaction, one component          | React state        | Open/closed state of a disclosure             |
| The URL (shareable, back-button-safe)   | URL query params   | List filters, sort, pagination, search `?q=`  |
| This device, across sessions            | Cookies            | View-mode preference, theme                   |
| Across devices, same user               | DB                 | Form drafts (`FilmDraft`), saved records      |

Before adding state, ask: who needs to see it, and for how long? That picks the owner.

## Why

- **The URL is the cheapest shareable link.** If filter/sort state is in React, pasting the URL into a chat gives someone a different view than yours. Users don't notice until it bites them.
- **Back-button sanity.** URL state means the browser's history behaves correctly for free. React state loses to Back; LocalStorage loses to Back and to incognito.
- **Cross-device requires the server.** A draft the user started on their phone must appear on their laptop — that's a database row, not LocalStorage.
- **One owner, no reconciliation.** When two places claim to own the same state (React + LocalStorage, URL + Cookie), you spend the next week debugging which one is "right" after a stale read.
- **Avoid state ghosts.** State in a global store (Redux, Zustand, Jotai) for things the URL could own creates invisible dependencies between unrelated components.

## In practice

### URL state — list filters

```tsx
// src/app/films/page.tsx
import { listFilmsSchema } from "@/features/film/schemas";
import { listFilms } from "@/features/film/data";

type SearchParams = Promise<{ q?: string; sort?: string; page?: string }>;

export default async function FilmsPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  // Zod with a safe default on invalid input (per data-ownership + validation convention)
  const { q, sort, page } = listFilmsSchema.catch({ q: "", sort: "recent", page: 1 }).parse(raw);

  const films = await listFilms({
    where: q ? { title: { contains: q, mode: "insensitive" } } : {},
    orderBy: sort === "title" ? { title: "asc" } : { createdAt: "desc" },
    skip: (page - 1) * 20,
    take: 20,
  });

  return <FilmList films={films} />;
}
```

### React state — ephemeral UI

```tsx
"use client";
export function FilmActions({ film }: { film: Film }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  // confirmOpen is one interaction, one component — React state is right.
}
```

### Cookies — device preference

```tsx
// Reading in a server component
import { cookies } from "next/headers";
const viewMode = (await cookies()).get("film-view-mode")?.value ?? "grid";

// Writing from a server action
"use server";
export async function setViewMode(mode: "grid" | "list") {
  (await cookies()).set("film-view-mode", mode, { httpOnly: false, sameSite: "lax" });
}
```

### DB — cross-device drafts

```prisma
// Sibling model introduced by the autosave-film slice
model FilmDraft {
  id        String   @id @default(cuid())
  userId    String
  payload   Json
  updatedAt DateTime @updatedAt

  @@unique([userId])  // one in-flight draft per user per entity
}
```

```ts
// src/features/film/data.ts
export function upsertFilmDraft(userId: string, payload: Prisma.JsonObject) {
  return db.filmDraft.upsert({
    where: { userId },
    create: { userId, payload },
    update: { payload },
  });
}
```

## Common violations

- **URL state stored in React.** Filter changes don't survive refresh. Pasting the URL doesn't preserve the view. Caught by the `list-*` slice's spec saying filters live in the URL.
- **Form input stored in URL.** `?title=&year=` on an edit form means every keystroke pushes history and the URL leaks data on paste. Form state is React state.
- **LocalStorage for drafts.** No cross-device, no cross-tab, no server authority to clean up. Autosave slice uses a DB sibling model (`<Entity>Draft`).
- **Global state library for state the URL could handle.** If reaching for Zustand/Redux to share list filters between a page and a widget, URL state solves it with no library.
- **Reading URL params without validation.** Any `?sort=invalid` must fall back to a default; never crash. Zod with `.catch(default)` or `.safeParse(...).success ? ... : default` at every URL boundary.
- **Writing cookies from a client component.** Set cookies in server actions. Client components can read `document.cookie` but should prefer props from a server component.
- **Reconciliation between owners.** A hook that "syncs" React state with URL params is a smell — pick one.

## Exceptions

- **Optimistic UI updates.** React state temporarily holds a value before the server confirms (e.g. `useOptimistic`). After the server responds, the state converges — this is a controlled, time-boxed double-ownership.
- **Non-essential UI toggles.** Modal open/closed, menu open/closed — React state is correct even though the URL *could* own them. Only move to the URL if the modal needs to be shareable (e.g. deep-linking to a specific film's details).
- **Dev-only toggles.** Debug flags and inspector panels can live in LocalStorage. Scope it to non-prod and don't let it leak into feature code.
- **Legacy wire-ups during migration.** When moving a feature from React state to URL state, both may coexist for one slice. Note the duplication in `plan.md` and remove the loser in the next slice.
