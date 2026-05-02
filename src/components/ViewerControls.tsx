import Link from "next/link";
import { ClearChildButton } from "@/components/ClearChildButton";
import { getViewer } from "@/lib/viewer";

export async function ViewerControls() {
  const { selectedPlayer } = await getViewer();
  if (!selectedPlayer) {
    return (
      <Link
        href="/choose-child"
        className="rounded-xl border border-border bg-foreground/5 px-3 py-2 text-xs font-medium"
      >
        Choose child
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden sm:inline rounded-xl border border-border bg-foreground/5 px-2 py-1 text-xs text-muted">
        {selectedPlayer.first_name} {selectedPlayer.last_name}
      </span>
      <ClearChildButton />
    </div>
  );
}
