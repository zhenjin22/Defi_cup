import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ViewerControls } from "@/components/ViewerControls";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { computeRanking } from "@/lib/db/ranking";
import { formatCourtDetails } from "@/lib/court-display";
import { formatDateTime } from "@/lib/format";
import { matchStatusBadgeClass, matchStatusLabel } from "@/lib/match-copy-en";
import { lockedOpponentIdsForPlayer } from "@/lib/pair-lock";
import { fetchGroupMatches, fetchGroupPlayers, fetchScoresByMatchIds } from "@/lib/queries";
import { DEFAULT_GROUP, getViewer } from "@/lib/viewer";

function badge(status: string) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        matchStatusBadgeClass(status),
      ].join(" ")}
    >
      {matchStatusLabel(status)}
    </span>
  );
}

export default async function HomePage() {
  const { selectedPlayer } = await getViewer();
  if (!selectedPlayer) {
    const { redirect } = await import("next/navigation");
    redirect("/choose-child");
  }
  const me = selectedPlayer!;
  const players = await fetchGroupPlayers(DEFAULT_GROUP);
  const matches = await fetchGroupMatches(DEFAULT_GROUP);
  const scoresByMatchId = await fetchScoresByMatchIds(matches.map((m) => m.id));
  const ranking = computeRanking({ players, matches, scoresByMatchId });

  const upcoming = matches
    .filter(
      (m) =>
        m.status === "waiting_response" ||
        m.status === "accepted" ||
        m.status === "declined" ||
        m.status === "closed_by_other_acceptance" ||
        m.status === "proposed" ||
        m.status === "availability_confirmed" ||
        m.status === "booking_failed" ||
        m.status === "scheduled" ||
        m.status === "published" ||
        m.status === "disputed" ||
        m.status === "resolved",
    )
    .filter((m) => m.player_a_id === me.id || m.player_b_id === me.id)
    .sort((a, b) => {
      const ad = a.selected_time ?? a.proposed_times?.[0] ?? "";
      const bd = b.selected_time ?? b.proposed_times?.[0] ?? "";
      return ad.localeCompare(bd);
    })
    .slice(0, 6);

  const lockedOpponents = lockedOpponentIdsForPlayer(me.id, matches);
  const notPlayedYet = players.filter((p) => p.id !== me.id && !lockedOpponents.has(p.id));

  const idToName = new Map(players.map((p) => [p.id, `${p.first_name} ${p.last_name}`]));

  const outgoingInvites = matches
    .filter((m) => m.inviter_player_id === me.id)
    .filter(
      (m) =>
        m.status === "waiting_response" ||
        m.status === "accepted" ||
        m.status === "declined" ||
        m.status === "closed_by_other_acceptance",
    )
    .slice(0, 6);

  const incomingInvites = matches
    .filter((m) => m.status === "waiting_response")
    .filter(
      (m) =>
        (m.player_a_id === me.id || m.player_b_id === me.id) &&
        m.inviter_player_id !== me.id,
    )
    .slice(0, 6);

  return (
    <AppShell title="Home" right={<ViewerControls />}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-tennis-green/30 bg-gradient-to-br from-tennis-green/25 to-background p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-tennis-green">Next step</p>
          <p className="mt-2 text-lg font-semibold leading-snug">
            Invite opponents and lock a court slot for {me.first_name}.
          </p>
          <ButtonLink
            href="/schedule"
            className="mt-4 h-14 w-full text-base font-semibold shadow-md hover:shadow-lg"
          >
            Schedule a Match
          </ButtonLink>
          <div className="mt-3 flex gap-2">
            <ButtonLink href="/result" variant="secondary" className="flex-1 text-center">
              Enter result
            </ButtonLink>
            <ButtonLink href="/ranking" variant="secondary" className="flex-1 text-center">
              Ranking
            </ButtonLink>
          </div>
        </div>

        <Card
          title="Group"
          right={
            <span className="inline-flex items-center rounded-full bg-foreground/5 px-2 py-0.5 text-[11px] font-medium text-muted">
              Summer 2026
            </span>
          }
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold">{DEFAULT_GROUP}</p>
              <p className="mt-1 text-sm text-muted">
                {players.length} players • Win +3 pts · Loss +1 pt · “Both absent” does not award points.
              </p>
            </div>
          </div>
        </Card>

        <Card
          title="Ranking snapshot"
          right={
            <Link href="/ranking" className="text-xs font-medium text-tennis-blue">
              Full table
            </Link>
          }
        >
          <div className="space-y-2">
            {ranking.slice(0, 5).map((r, idx) => (
              <div
                key={r.playerId}
                className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center text-xs font-semibold text-muted">{idx + 1}</span>
                  <span className="text-sm font-medium">{r.playerName}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span>{r.points} pts</span>
                  <span>Δ {r.scoreDiff}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Upcoming matches">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted">
              Nothing on the horizon yet — tap <strong>Schedule a Match</strong> above.
            </p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((m) => {
                const a = idToName.get(m.player_a_id) ?? "Player A";
                const b = idToName.get(m.player_b_id) ?? "Player B";
                const when = m.selected_time ?? m.proposed_times?.[0] ?? null;
                return (
                  <Link
                    key={m.id}
                    href={`/matches/${m.id}`}
                    className="block rounded-2xl border border-border bg-background p-3 hover:bg-foreground/5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {a} vs {b}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {when ? formatDateTime(when) : "Time TBC"} • {formatCourtDetails(m)}
                        </p>
                      </div>
                      {badge(m.status)}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Invitations inbox">
          {incomingInvites.length === 0 ? (
            <p className="text-sm text-muted">Nothing new.</p>
          ) : (
            <div className="space-y-2">
              {incomingInvites.map((m) => {
                const inviterName = idToName.get(m.inviter_player_id ?? "") ?? "A player";
                return (
                  <Link
                    key={m.id}
                    href={`/matches/${m.id}`}
                    className="block rounded-2xl border border-border bg-background p-3 hover:bg-foreground/5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{inviterName} invited your child</p>
                        <p className="mt-1 text-xs text-muted">Open to reply</p>
                      </div>
                      {badge(m.status)}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Sent invitations">
          {outgoingInvites.length === 0 ? (
            <p className="text-sm text-muted">No pending invites from you.</p>
          ) : (
            <div className="space-y-2">
              {outgoingInvites.map((m) => {
                const otherId = m.player_a_id === me.id ? m.player_b_id : m.player_a_id;
                const otherName = idToName.get(otherId) ?? "Opponent";
                return (
                  <Link
                    key={m.id}
                    href={`/matches/${m.id}`}
                    className="block rounded-2xl border border-border bg-background p-3 hover:bg-foreground/5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Invite to {otherName}</p>
                        <p className="mt-1 text-xs text-muted">
                          {m.proposed_times?.length ? `${m.proposed_times.length} suggested slots` : "—"}
                        </p>
                      </div>
                      {badge(m.status)}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Opponents without a finished result">
          {notPlayedYet.length === 0 ? (
            <p className="text-sm text-muted">
              Every pairing has a published / resolved outcome (round-robin: one meeting per opponent).
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {notPlayedYet.slice(0, 10).map((p) => (
                <span
                  key={p.id}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs"
                >
                  {p.first_name} {p.last_name}
                </span>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
