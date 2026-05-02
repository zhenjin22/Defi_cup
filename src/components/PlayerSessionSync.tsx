"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LOCAL_SELECTED_PLAYER_KEY } from "@/lib/app-constants";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * If localStorage still has the selected child id but the httpOnly cookie is missing
 * (e.g. after long auth flows), restore the cookie without clearing parent context.
 */
export function PlayerSessionSync() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname.startsWith("/login") || pathname.startsWith("/auth")) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const st = (await fetch("/api/session/player", { credentials: "include" }).then((r) =>
          r.json(),
        )) as { hasPlayerCookie?: boolean };
        if (cancelled || st?.hasPlayerCookie) return;

        let ls: string | null = null;
        try {
          ls = localStorage.getItem(LOCAL_SELECTED_PLAYER_KEY);
        } catch {
          return;
        }
        if (!ls || !UUID_RE.test(ls)) return;

        const res = await fetch("/api/session/player", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ player_id: ls }),
        });
        if (!cancelled && res.ok) {
          router.refresh();
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}
