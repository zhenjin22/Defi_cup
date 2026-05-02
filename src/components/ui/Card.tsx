type CardProps = {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function Card({ title, right, children, className }: CardProps) {
  return (
    <section
      className={[
        "rounded-2xl border border-border bg-card shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {(title || right) && (
        <header className="flex items-center justify-between gap-3 px-4 pt-4">
          {title ? <h2 className="text-sm font-semibold">{title}</h2> : <span />}
          {right}
        </header>
      )}
      <div className="px-4 pb-4 pt-3">{children}</div>
    </section>
  );
}

