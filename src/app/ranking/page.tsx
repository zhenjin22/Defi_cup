import { AppShell } from "@/components/AppShell";
import { ViewerControls } from "@/components/ViewerControls";
import { Card } from "@/components/ui/Card";
import { computeRanking } from "@/lib/db/ranking";
import { fetchGroupMatches, fetchGroupPlayers, fetchScoresByMatchIds } from "@/lib/queries";
import { DEFAULT_GROUP, getViewer } from "@/lib/viewer";

export default async function RankingPage() {
  const { selectedPlayer } = await getViewer();
  if (!selectedPlayer) {
    const { redirect } = await import("next/navigation");
    redirect("/choose-child");
  }
  const players = await fetchGroupPlayers(DEFAULT_GROUP);
  const matches = await fetchGroupMatches(DEFAULT_GROUP);
  const scoresByMatchId = await fetchScoresByMatchIds(matches.map((m) => m.id));
  const ranking = computeRanking({ players, matches, scoresByMatchId });

  return (
    <AppShell title="Ranking" right={<ViewerControls />}>
      <Card title={DEFAULT_GROUP}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">Player</th>
                <th className="py-2 pr-2">Played</th>
                <th className="py-2 pr-2">W</th>
                <th className="py-2 pr-2">L</th>
                <th className="py-2 pr-2">Pts</th>
                <th className="py-2 pr-2">Δ</th>
                <th className="py-2 pr-2">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, idx) => (
                <tr key={r.playerId} className="border-t border-border">
                  <td className="py-2 pr-2 text-muted">{idx + 1}</td>
                  <td className="py-2 pr-2 font-medium">{r.playerName}</td>
                  <td className="py-2 pr-2">{r.matchesPlayed}</td>
                  <td className="py-2 pr-2">{r.wins}</td>
                  <td className="py-2 pr-2">{r.losses}</td>
                  <td className="py-2 pr-2 font-semibold">{r.points}</td>
                  <td className="py-2 pr-2">{r.scoreDiff}</td>
                  <td className="py-2 pr-2">{r.remainingMatches}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">
          Sorting: points, then score difference (approximate from saved lines). Walkovers count as wins/losses;
          &quot;both absent&quot; rows do not award points. Each opponent pairing can only be completed once unless
          an admin resets the match.
        </p>
      </Card>
    </AppShell>
  );
}
