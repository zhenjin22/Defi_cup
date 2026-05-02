"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { LOCAL_SELECTED_PLAYER_KEY } from "@/lib/app-constants";

export function ClearChildButton() {
  const [pending, setPending] = useState(false);

  return (
    <Button
      variant="secondary"
      size="sm"
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await fetch("/api/session/player", { method: "DELETE" });
        } catch {
          // still navigate
        }
        try {
          localStorage.removeItem(LOCAL_SELECTED_PLAYER_KEY);
        } catch {
          // ignore
        }
        window.location.assign("/choose-child");
      }}
    >
      {pending ? "…" : "Switch child"}
    </Button>
  );
}
