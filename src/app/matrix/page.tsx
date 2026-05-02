import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ViewerControls } from "@/components/ViewerControls";
import { Card } from "@/components/ui/Card";
import { isPairingResultLocked } from "@/lib/pair-lock";
import { fetchGroupMatches, fetchGroupPlayers, getMatchKey } from "@/lib/queries";
import { DEFAULT_GROUP, getViewer } from "@/lib/viewer";

function cellStyle(status: string) {
  switch (status) {
    case "waiting_response":
      return "bg-foreground/5";
    case "accepted":
      return "bg-tennis-blue/10";
    case "declined":
      return "bg-foreground/5";
    case "closed_by_other_acceptance":
      return "bg-foreground/5";
    case "proposed":
      return "bg-tennis-yellow/25";
    case "availability_confirmed":
      return "bg-tennis-blue/15";
    case "booking_failed":
      return "bg-red-50";
    case "scheduled":
      return "bg-tennis-green/15";
    case "published":
      return "bg-foreground/10";
    case "disputed":
      return "bg-red-50";
    case "resolved":
      return "bg-tennis-green/25";
    default:
      return "bg-background";
  }
}

function shortStatus(status: string) {
  switch (status) {
    case "waiting_response":
      return "⏳";
    case "accepted":
      return "A";
    case "declined":
      return "✕";
    case "closed_by_other_acceptance":
      return "×";
    case "proposed":
      return "P";
    case "availability_confirmed":
      return "D";
    case "booking_failed":
      return "T";
    case "scheduled":
      return "R";
    case "published":
      return "✓";
    case "disputed":
      return "⚠";
    case "resolved":
      return "V";
    default:
      return "—";
  }
}

export default async function MatrixPage() {
  const { selectedPlayer } = await getViewer();
  if (!selectedPlayer) {
    const { redirect } = await import("next/navigation");
    redirect("/choose-child");
  }
  const players = await fetchGroupPlayers(DEFAULT_GROUP);
  const matches = await fetchGroupMatches(DEFAULT_GROUP);

  const matchByKey = new Map<string, { id: string; status: string }>();
  for (const m of matches) {
    matchByKey.set(getMatchKey(m.player_a_id, m.player_b_id), {
      id: m.id,
      status: m.status,
    });
  }

  return (
    <AppShell title="Matrix" right={<ViewerControls />}>
      <Card
        title={DEFAULT_GROUP}
        right={
          <span className="max-w-[220px] text-right text-[10px] leading-tight text-muted sm:max-w-none sm:text-xs">
            Done = completed (locked) · ⏳ pending · A accepted · R booked · ⚠ disputed
          </span>
        }
      >
        <div className="overflow-auto rounded-2xl border border-border">
          <table className="min-w-[720px] w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-card">
              <tr>
                <th className="sticky left-0 z-10 bg-card p-2 text-left font-semibold">Player</th>
                {players.map((p) => (
                  <th key={p.id} className="p-2 text-center font-semibold">
                    {p.first_name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <th className="sticky left-0 z-10 bg-card p-2 text-left font-medium">
                    {row.first_name} {row.last_name}
                  </th>
                  {players.map((col) => {
                    if (row.id === col.id) {
                      return (
                        <td key={col.id} className="p-2 text-center text-muted">
                          —
                        </td>
                      );
                    }
                    const key = getMatchKey(row.id, col.id);
                    const match = matchByKey.get(key);
                    const status = match?.status ?? "not_scheduled";
                    const completed = match ? isPairingResultLocked(match.status) : false;
                    const href = completed
                      ? `/matches/${match!.id}`
                      : match
                        ? `/matches/${match.id}`
                        : `/schedule?opponent=${encodeURIComponent(col.id)}`;

                    return (
                      <td key={col.id} className="p-0 text-center">
                        <Link
                          href={href}
                          className={[
                            "block min-h-[2.5rem] p-1 leading-tight border-l border-border hover:brightness-95 flex flex-col items-center justify-center gap-0.5",
                            cellStyle(status),
                          ].join(" ")}
                          title={
                            completed ? "Completed — pairing locked" : status.replaceAll("_", " ")
                          }
                        >
                          {completed ? (
                            <span className="text-[10px] font-bold uppercase tracking-tight text-tennis-green">
                              Done
                            </span>
                          ) : (
                            <span>{shortStatus(status)}</span>
                          )}
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
