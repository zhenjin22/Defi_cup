"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";

type Props = {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
};

export function SubmitButton({
  children,
  pendingLabel = "Enregistrement…",
  className,
  variant = "primary",
  size = "md",
}: Props) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant={variant} size={size} className={className}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
