# Data ownership

## The rule

UI code never touches `@prisma/client` or `db` directly. All database access flows in one direction:

```
UI (server component / client component)
   └─ server action (src/features/<entity>/actions.ts)
        └─ data function (src/features/<entity>/data.ts)
             └─ db (src/db/schema.ts) → Prisma
```

Server actions are the only write boundary. Data functions are the only module that imports from `@prisma/client` (via the generated client). `db` is instantiated exactly once, in `src/db/schema.ts`, behind `import "server-only"`.

## Why

- **Testability.** Data functions are plain async functions over `db`; unit tests can mock `db` or hit a test schema. If every component held its own Prisma call, unit testing becomes end-to-end testing.
- **Security.** `import "server-only"` on `src/db/schema.ts` makes it impossible for a client component to transitively pull Prisma into the browser bundle. The build fails loudly rather than shipping secrets.
- **One connection pool.** Each `new PrismaClient()` opens a pool. Many pools exhaust the DB. The singleton pattern (`globalForPrisma.prisma ?? createPrismaClient()`) keeps hot reload from leaking pools in dev.
- **Swap surface is bounded.** If the ORM ever changes, the only files that touch the import are `src/db/schema.ts` and `src/features/*/data.ts`. Everything else stays put.
- **Server actions are auditable.** Every mutation is a named server action in a known location. Easy to grep, easy to protect, easy to log.

## In practice

### Data function

```ts
// src/features/film/data.ts
import "server-only";
import { db } from "@/db/schema";
import type { Prisma } from "@/generated/prisma";

export function listFilms(args: Prisma.FilmFindManyArgs = {}) {
  return db.film.findMany(args);
}

export function createFilm(input: Prisma.FilmCreateInput) {
  return db.film.create({ data: input });
}
```

### Server action

```ts
// src/features/film/actions.ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createFilmSchema } from "./schemas";
import { createFilm } from "./data";

export async function createFilmAction(_prev: unknown, formData: FormData) {
  const parsed = createFilmSchema.safeParse({
    title: formData.get("title"),
    year: Number(formData.get("year")),
  });

  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  await createFilm(parsed.data);
  revalidatePath("/films");
  redirect("/films");
}
```

### Server component calling a data function

```tsx
// src/app/films/page.tsx
import { listFilms } from "@/features/film/data";

export default async function FilmsPage() {
  const films = await listFilms({ orderBy: { createdAt: "desc" } });
  return <FilmList films={films} />;
}
```

### Client component — stays data-free

```tsx
// src/app/films/FilmList.tsx
"use client";
// never: import { db } from "@/db/schema";
// never: import { listFilms } from "@/features/film/data";

export function FilmList({ films }: { films: Film[] }) { /* ... */ }
```

## Common violations

- **Client component importing `@prisma/client` or anything under `src/features/*/data.ts`.** Build may succeed in dev then fail in prod, or ship secrets. Caught by the `server-only` guard; `review-slice` will also flag it.
- **A server action with inline `db` calls** instead of calling a data function. Short-term convenient, hard to test. Extract to `data.ts`.
- **Multiple `new PrismaClient()` instantiations.** Any file other than `src/db/schema.ts` instantiating a client is a bug — grep for `new PrismaClient` and expect exactly one hit.
- **Reaching through the layers.** A server component importing from `src/features/film/actions.ts` and calling the action directly instead of calling the data function. Actions are for writes from a form boundary; server components reading data should call the data function.
- **Secrets or `DATABASE_URL` referenced outside `src/db/schema.ts`.** Centralize env access.

## Exceptions

- **Route handlers (`route.ts`)** are server-only and can call data functions directly. Reserve them for non-form contracts (CSV export streaming, webhooks).
- **Scripts under `scripts/`** can import `@/db/schema` and `@/features/*/data` directly — they're not UI.
- **Seeding and migrations** can instantiate their own client. These run outside the request lifecycle and don't share the pool.
- **Streaming export** may use `db.$queryRaw` or cursor-based iteration directly in the route handler if the data function layer would obscure the streaming shape. Document the exception inline.
