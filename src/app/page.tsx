const swatches = [
  { name: "bg", className: "bg-bg" },
  { name: "fg", className: "bg-fg" },
  { name: "muted-fg", className: "bg-muted-fg" },
  { name: "border", className: "bg-border" },
  { name: "accent", className: "bg-accent" },
] as const;

export default function Home() {
  return (
    <main className="min-h-screen bg-bg text-fg font-sans">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <header className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight">next-drizzle-crud-starter</h1>
          <p className="mt-2 text-muted-fg">
            A Next.js + Prisma CRUD scaffold. Build one vertical slice at a time.
          </p>
        </header>

        <section aria-labelledby="status" className="mb-10 rounded-card border border-border p-5">
          <h2 id="status" className="text-xs font-medium uppercase tracking-wide text-muted-fg">
            Status
          </h2>
          <p className="mt-2">
            No slices yet. Draft one with the <code className="font-mono text-accent">new-slice</code> skill.
          </p>
        </section>

        <section aria-labelledby="tokens" className="mb-10">
          <h2 id="tokens" className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-fg">
            Color
          </h2>
          <ul className="grid grid-cols-5 gap-3">
            {swatches.map(({ name, className }) => (
              <li key={name} className="flex flex-col items-center gap-2">
                <div className={`h-12 w-full rounded-control border border-border ${className}`} />
                <span className="font-mono text-xs text-muted-fg">{name}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="type" className="mb-10">
          <h2 id="type" className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-fg">
            Type
          </h2>
          <p className="font-sans text-lg">Sans — the quick brown fox jumps over the lazy dog.</p>
          <p className="mt-2 font-mono text-sm">{"Mono — await db.film.findMany({ orderBy: { createdAt: 'desc' } })"}</p>
        </section>

        <section aria-labelledby="control" className="mb-10">
          <h2 id="control" className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-fg">
            Control
          </h2>
          <button
            type="button"
            className="min-h-11 min-w-11 rounded-control bg-accent px-4 py-2 font-medium text-bg transition duration-fast ease-standard hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Focusable button
          </button>
          <p className="mt-2 text-sm text-muted-fg">
            44×44 min, visible focus ring, fast duration + standard easing.
          </p>
        </section>

        <footer className="mt-16 border-t border-border pt-6 text-sm text-muted-fg">
          <p>
            Dark mode follows <code className="font-mono">prefers-color-scheme</code>. See{" "}
            <code className="font-mono">AGENTS.md</code> for the slice workflow.
          </p>
        </footer>
      </div>
    </main>
  );
}
