import Link from "next/link";
import { forwardRef } from "react";

type CommonProps = {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  className?: string;
  children: React.ReactNode;
};

const styles = {
  base: "inline-flex items-center justify-center rounded-xl font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
  size: {
    sm: "h-9 px-3 text-sm",
    md: "h-11 px-4 text-sm",
  },
  variant: {
    primary:
      "bg-primary text-primary-foreground hover:bg-tennis-green/90 shadow-sm",
    secondary:
      "bg-foreground/5 text-foreground hover:bg-foreground/10 border border-border",
    ghost: "bg-transparent text-foreground hover:bg-foreground/5",
    danger: "bg-red-600 text-white hover:bg-red-500",
  },
} as const;

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

export const Button = forwardRef<
  HTMLButtonElement,
  CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function Button(
  { variant = "primary", size = "md", className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cx(styles.base, styles.size[size], styles.variant[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
});

export function ButtonLink(
  props: CommonProps & { href: string } & Omit<
      React.ComponentProps<typeof Link>,
      "href" | "className"
    >,
) {
  const { variant = "primary", size = "md", className, href, children, ...rest } =
    props;
  return (
    <Link
      href={href}
      className={cx(styles.base, styles.size[size], styles.variant[variant], className)}
      {...rest}
    >
      {children}
    </Link>
  );
}

