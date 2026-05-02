type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
};

export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        {hint ? <span className="text-xs text-muted">{hint}</span> : null}
      </div>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none",
        "focus:ring-2 focus:ring-tennis-blue/30 focus:border-tennis-blue/40",
        props.className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={[
        "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none",
        "focus:ring-2 focus:ring-tennis-blue/30 focus:border-tennis-blue/40",
        props.className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        "min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none",
        "focus:ring-2 focus:ring-tennis-blue/30 focus:border-tennis-blue/40",
        props.className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

