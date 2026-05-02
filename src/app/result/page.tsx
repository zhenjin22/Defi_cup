import { DirectResultForm } from "@/components/DirectResultForm";
import { AppShell } from "@/components/AppShell";
import { ViewerControls } from "@/components/ViewerControls";
import { Card } from "@/components/ui/Card";
import { lockedOpponentIdsForPlayer } from "@/lib/pair-lock";
import { fetchGroupMatches, fetchGroupPlayers } from "@/lib/queries";
import { DEFAULT_GROUP, getViewer } from "@/lib/viewer";

export default async function DirectResultPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const err = typeof sp.error === "string" ? sp.error : null;
  const errMsg =
    err === "pair_already_completed"
      ? "That pairing already has a result on file (pair_already_completed). Ask an admin to reset if it was a mistake."
      : err === "invalid" || err === "invalid_winner"
        ? "Please check the form and try again."
        : err === "invalid_games" || err === "games_invalid"
          ? "Enter games as numbers like 1:6 3:11 0:15 (player A : player B for each segment)."
          : err === "games_tie"
            ? "Total games are tied — pick a winner that matches who won more games overall, or adjust the segments."
            : err === "winner_games_mismatch"
              ? "The winner you picked does not match who won more games in the score line (first name in each pair = first player on file for that pairing)."
              : err
                ? String(err)
                : null;

  const { selectedPlayer } = await getViewer();
  if (!selectedPlayer) {
    const { redirect } = await import("next/navigation");
    redirect("/choose-child");
  }
  const me = selectedPlayer!;
  const players = await fetchGroupPlayers(DEFAULT_GROUP);
  const matches = await fetchGroupMatches(DEFAULT_GROUP);
  const locked = lockedOpponentIdsForPlayer(me.id, matches);
  const opponents = players.filter((p) => p.id !== me.id && !locked.has(p.id));

  return (
    <AppShell title="Enter result" right={<ViewerControls />}>
      <Card title="Match organised outside the app">
        {errMsg ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{errMsg}</div>
        ) : null}
        <p className="text-sm text-muted">
          Pick the opponent, choose the outcome (including walkovers), then publish. For a played match, enter games
          won in open format (e.g. 1:6 3:11 0:15 — each pair is games for the first player on file vs the second).
          Rankings use total games won. Players you already completed are hidden.
        </p>
        <div className="mt-4">
          {opponents.length === 0 ? (
            <p className="text-sm text-muted">No opponents left without a finished result.</p>
          ) : (
            <DirectResultForm me={me} opponents={opponents} />
          )}
        </div>
      </Card>
    </AppShell>
  );
}
