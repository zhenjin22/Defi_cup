import Link from "next/link";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/ranking", label: "Ranking" },
  { href: "/matrix", label: "Matrix" },
  { href: "/schedule", label: "Schedule" },
  { href: "/availability", label: "Availability" },
  { href: "/result", label: "Result" },
  { href: "/rules", label: "Rules" },
  { href: "/admin", label: "Admin" },
] as const;

export function AppShell({
  title,
  children,
  right,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <nav className="mx-auto max-w-3xl border-b border-border/60 px-4 py-2">
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center sm:justify-between">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:bg-foreground/5 hover:text-foreground sm:text-sm"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
        <div className="mx-auto flex min-h-14 max-w-3xl items-center justify-between gap-3 px-4 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 shrink-0 rounded-lg bg-tennis-yellow" />
            <div className="leading-tight min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted sm:text-xs">Défi Cup Juniors</p>
              <p className="truncate text-sm font-semibold sm:text-base">{title}</p>
            </div>
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4 pb-10">{children}</main>
    </div>
  );
}
