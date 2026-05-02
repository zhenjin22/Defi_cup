import {
  bookCourt,
  acceptInvitationAndCloseOthers,
  declineInvitation,
  markBookingFailed,
  reportScoreDispute,
  setBookingResponsible,
  submitAvailability,
  submitScore,
} from "@/app/actions/matches";
import { AppShell } from "@/components/AppShell";
import { ScoreEntryFormControls } from "@/components/ScoreEntryFormControls";
import { ViewerControls } from "@/components/ViewerControls";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { Match, Player, Score } from "@/lib/db/types";
import { formatCourtDetails } from "@/lib/court-display";
import { formatDateTime } from "@/lib/format";
import { matchStatusBadgeClass, matchStatusLabel } from "@/lib/match-copy-en";
import { isPairingResultLocked } from "@/lib/pair-lock";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

function statusBadge(status: string) {
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

export default async function MatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;

  const supabase = await createSupabaseServerClient();
  const { data: match } = await supabase.from("matches").select("*").eq("id", id).single();
  const m = match as Match;

  const { data: players } = await supabase
    .from("players")
    .select("*")
    .in("id", [m.player_a_id, m.player_b_id]);
  const pMap = new Map<string, Player>((players as Player[]).map((p) => [p.id, p]));

  const playerA = pMap.get(m.player_a_id);
  const playerB = pMap.get(m.player_b_id);

  const { data: scoreRow } = await supabase
    .from("scores")
    .select("*")
    .eq("match_id", m.id)
    .maybeSingle();
  const score = (scoreRow ?? null) as Score | null;

  const { selectedPlayer } = await getViewer();
  if (!selectedPlayer) {
    const { redirect } = await import("next/navigation");
    redirect("/choose-child");
  }
  const me = selectedPlayer!;
  const viewerSide =
    me.id === m.player_a_id ? "a" : me.id === m.player_b_id ? "b" : null;

  const viewerMatchSide =
    viewerSide === "a" ? ("player_a" as const) : viewerSide === "b" ? ("player_b" as const) : null;
  const isOpponentOfProposer =
    m.proposed_by && viewerMatchSide ? m.proposed_by !== viewerMatchSide : false;
  const canSubmitAvailability = m.status === "proposed" && isOpponentOfProposer;
  const availableTimes = (m.opponent_available_times ?? []) as string[];
  const canBookCourt =
    (m.status === "accepted" || m.status === "availability_confirmed") &&
    viewerMatchSide &&
    m.booking_responsible === viewerMatchSide;

  const isInviteOpponent =
    m.status === "waiting_response" &&
    m.inviter_player_id !== null &&
    (m.player_a_id === me.id || m.player_b_id === me.id) &&
    m.inviter_player_id !== me.id;

  const venueLine = formatCourtDetails(m);
  const pairingLocked = isPairingResultLocked(m.status);

  const errorDisplayed =
    error === "pair_already_completed"
      ? "This pairing already has a final result on file (pair_already_completed). An organiser must use Admin → Reset Match to unlock it."
      : error === "invalid_games" || error === "games_invalid"
        ? "Enter games as numbers like 1:6 3:11 0:15 (first player on file : second player for each segment)."
        : error === "games_tie"
          ? "Total games are tied — choose a winner that matches who won more games, or adjust the score."
          : error === "winner_games_mismatch"
            ? "The winner does not match who won more games in the score line."
            : error
              ? decodeURIComponentSafe(error)
              : null;

  return (
    <AppShell title="Match" right={<ViewerControls />}>
      <div className="space-y-4">
        {errorDisplayed ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorDisplayed}</div>
        ) : null}

        <Card title="Players" right={statusBadge(m.status)}>
          <p className="text-base font-semibold">
            {playerA ? `${playerA.first_name} ${playerA.last_name}` : "Player A"} vs{" "}
            {playerB ? `${playerB.first_name} ${playerB.last_name}` : "Player B"}
          </p>
          <p className="mt-3 rounded-xl bg-foreground/5 p-3 text-sm leading-relaxed border border-border/80">
            <span className="font-semibold text-foreground">Where we play</span>
            <br />
            <span className="text-muted">Venue: </span>
            <span>{venueLine}</span>
          </p>
          <p className="mt-3 text-xs text-muted">
            Booking lead:{" "}
            {m.booking_responsible === "undecided"
              ? "To decide"
              : m.booking_responsible === "player_a"
                ? `${playerA?.first_name ?? "Player A"} parent`
                : `${playerB?.first_name ?? "Player B"} parent`}{" "}
            · Status {m.booking_status.replaceAll("_", " ")}
          </p>
        </Card>

        <Card title="Suggested times">
          {(m.proposed_times ?? []).length === 0 ? (
            <p className="text-sm text-muted">No suggested slots yet.</p>
          ) : (
            <div className="space-y-2">
              {m.proposed_times.map((t) => (
                <div
                  key={t}
                  className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2"
                >
                  <span className="text-sm">{formatDateTime(t)}</span>
                  {availableTimes.includes(t) ? (
                    <span className="text-xs font-medium text-tennis-green">You’re available</span>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {m.status === "waiting_response" ? (
            <div className="mt-4 space-y-3">
              {isInviteOpponent ? (
                <div className="rounded-xl border border-border bg-foreground/5 p-3 text-sm">
                  <p className="font-semibold">Invitation received</p>
                  <p className="mt-1 text-muted">Accept or decline, then pick the slots that work for you.</p>
                </div>
              ) : (
                <p className="text-sm text-muted">Invitation sent — waiting for a reply.</p>
              )}

              {isInviteOpponent ? (
                <>
                  <form action={acceptInvitationAndCloseOthers} className="space-y-2">
                    <input type="hidden" name="match_id" value={m.id} />
                    <p className="text-sm text-muted">Select every slot you can play (multiple allowed).</p>
                    <div className="mt-2 space-y-2">
                      {m.proposed_times.map((t) => (
                        <label
                          key={t}
                          className="flex items-center justify-between rounded-xl border border-border bg-foreground/5 px-3 py-2"
                        >
                          <span className="text-sm">{formatDateTime(t)}</span>
                          <input type="checkbox" name="available_times" value={t} />
                        </label>
                      ))}
                    </div>
                    <SubmitButton className="w-full" pendingLabel="Saving…">
                      Accept
                    </SubmitButton>
                  </form>

                  <form action={declineInvitation}>
                    <input type="hidden" name="match_id" value={m.id} />
                    <SubmitButton variant="secondary" className="w-full" pendingLabel="…">
                      Decline
                    </SubmitButton>
                  </form>
                </>
              ) : null}
            </div>
          ) : null}

          {m.status === "proposed" ? (
            <div className="mt-4">
              {canSubmitAvailability ? (
                <form action={submitAvailability} className="space-y-2">
                  <input type="hidden" name="match_id" value={m.id} />
                  <p className="text-sm text-muted">
                    Tick every slot where you&apos;re available (multiple allowed).
                  </p>
                  <div className="mt-2 space-y-2">
                    {m.proposed_times.map((t) => (
                      <label
                        key={t}
                        className="flex items-center justify-between rounded-xl border border-border bg-foreground/5 px-3 py-2"
                      >
                        <span className="text-sm">{formatDateTime(t)}</span>
                        <input type="checkbox" name="available_times" value={t} />
                      </label>
                    ))}
                  </div>
                  <SubmitButton className="w-full" pendingLabel="Saving…">
                    Confirm availability
                  </SubmitButton>
                </form>
              ) : (
                <p className="text-sm text-muted">Waiting for your opponent&apos;s availability.</p>
              )}
            </div>
          ) : null}

          {m.status === "accepted" || m.status === "availability_confirmed" ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-border bg-foreground/5 p-3 text-sm">
                <p className="font-semibold">Availabilities overlap</p>
                <p className="mt-1 text-muted">
                  The nominated parent books a court using one agreed slot below. Fill in venue name / court / address
                  so both families know exactly where to go.
                </p>
              </div>

              {m.booking_responsible === "undecided" ? (
                <form action={setBookingResponsible} className="space-y-2">
                  <input type="hidden" name="match_id" value={m.id} />
                  <Field label="Who books the court?">
                    <Select name="responsible" required defaultValue="">
                      <option value="" disabled>
                        Choose…
                      </option>
                      <option value="player_a">{playerA?.first_name ?? "Player A"} parent</option>
                      <option value="player_b">{playerB?.first_name ?? "Player B"} parent</option>
                    </Select>
                  </Field>
                  <SubmitButton className="w-full" pendingLabel="…">
                    Save
                  </SubmitButton>
                </form>
              ) : null}

              {canBookCourt ? (
                <form action={bookCourt} className="space-y-3">
                  <input type="hidden" name="match_id" value={m.id} />
                  <Field label="Final slot">
                    <Select name="selected_time" required defaultValue="">
                      <option value="" disabled>
                        Pick one overlapping slot
                      </option>
                      {availableTimes.map((t) => (
                        <option key={t} value={t}>
                          {formatDateTime(t)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Venue / club name">
                    <Input name="court_name" placeholder='e.g. "TC Genève Plainpalais"' required />
                  </Field>
                  <Field label="Court number / label (if any)">
                    <Input name="court_number" placeholder="e.g. 3 · Court des écoles · indoor barn" />
                  </Field>
                  <Field label="Address or extra directions">
                    <Input
                      name="court_address_notes"
                      placeholder="Street, pavilion door, WhatsApp gate code…"
                    />
                  </Field>
                  <SubmitButton className="w-full" pendingLabel="Saving…">
                    Court booked — save details
                  </SubmitButton>
                </form>
              ) : (
                <p className="text-sm text-muted">Waiting for the court booking from the responsible parent.</p>
              )}

              <form action={markBookingFailed}>
                <input type="hidden" name="match_id" value={m.id} />
                <SubmitButton variant="secondary" className="w-full" pendingLabel="…">
                  Court not available — reset flow
                </SubmitButton>
              </form>
            </div>
          ) : null}

          {m.status === "booking_failed" ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Court search failed — propose new times from the schedule screen.
            </div>
          ) : null}

          {m.status === "scheduled" && m.selected_time ? (
            <div className="mt-4 rounded-xl border border-tennis-green/40 bg-tennis-green/10 p-3">
              <p className="text-sm font-semibold">Scheduled match</p>
              <p className="mt-1 text-sm">{formatDateTime(m.selected_time)}</p>
              <p className="mt-2 text-sm font-medium">{venueLine}</p>
            </div>
          ) : null}
        </Card>

        <Card title="Result">
          {m.status !== "scheduled" ? (
            <p className="text-sm text-muted">
              You can still publish a result if the match happened outside the booking flow. Use open-game segments
              (e.g. 1:6 3:11 0:15) — first number = games for the first player on file above, second = the other player.
            </p>
          ) : null}

          {score ? (
            <div className="rounded-xl border border-border bg-background p-3 space-y-2">
              <p className="text-sm font-semibold">Current result</p>
              <p className="text-sm">{score.score_text}</p>
              {score.no_show_status !== "none" ? (
                <p className="text-xs font-semibold text-amber-800">
                  {score.no_show_status === "both_absent"
                    ? "No ranking points — both players absent."
                    : "Walkover — winner receives a win; absent player recorded as a loss."}
                </p>
              ) : null}
              <p className="text-xs text-muted">
                Status:{" "}
                {score.score_status === "published"
                  ? "Published"
                  : score.score_status === "disputed"
                    ? "Disputed"
                    : "Resolved after dispute"}
              </p>
              {score.note ? <p className="text-xs text-muted">Note: {score.note}</p> : null}
            </div>
          ) : (
            <p className="text-sm text-muted">No result yet.</p>
          )}

          {playerA && playerB && !pairingLocked ? (
            <form action={submitScore} className="mt-4 space-y-3">
              <input type="hidden" name="match_id" value={m.id} />
              <ScoreEntryFormControls
                playerAId={m.player_a_id}
                playerBId={m.player_b_id}
                nameA={`${playerA.first_name} ${playerA.last_name}`}
                nameB={`${playerB.first_name} ${playerB.last_name}`}
              />
              <SubmitButton className="w-full" pendingLabel="Publishing…">
                Publish result
              </SubmitButton>
            </form>
          ) : null}

          {playerA && playerB && pairingLocked ? (
            <p className="mt-4 rounded-xl border border-border bg-foreground/5 p-3 text-sm text-muted">
              This pairing is complete and locked for the round-robin. Contact an admin if something needs correcting.
            </p>
          ) : null}

          {score && score.score_status === "published" ? (
            <details className="mt-3 rounded-xl border border-border bg-background p-3">
              <summary className="cursor-pointer text-sm font-medium">Disagree with this result?</summary>
              <form action={reportScoreDispute} className="mt-3 space-y-3">
                <input type="hidden" name="match_id" value={m.id} />
                <Field label="Describe the issue">
                  <Input name="dispute_note" placeholder="e.g. winner reversed…" required />
                </Field>
                <SubmitButton variant="secondary" className="w-full" pendingLabel="Sending…">
                  Flag for admin
                </SubmitButton>
              </form>
            </details>
          ) : null}
        </Card>
      </div>
    </AppShell>
  );
}

function decodeURIComponentSafe(raw: string) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
