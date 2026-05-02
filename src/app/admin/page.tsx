import Link from "next/link";
import {
  adminMarkDisputeResolved,
  adminReopenInvitation,
  adminResetMatch,
  adminResolveDispute,
  adminUpdateMatchStatus,
  adminUpdatePlayer,
  adminUpdateScoreText,
} from "@/app/actions/admin";
import { AppShell } from "@/components/AppShell";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { Match, Player, Score } from "@/lib/db/types";
import { assertAdminSupabase } from "@/lib/admin";

const MATCH_STATUSES = [
  "not_scheduled",
  "waiting_response",
  "accepted",
  "declined",
  "closed_by_other_acceptance",
  "proposed",
  "availability_confirmed",
  "booking_failed",
  "scheduled",
  "published",
  "disputed",
  "resolved",
] as const;

function flashText(code: string | null) {
  switch (code) {
    case "player_saved":
      return "Player saved.";
    case "match_saved":
      return "Match saved.";
    case "match_reset":
      return "Match reset — round-robin pairing unlocked.";
    case "invitation_reopened":
      return "Invitation reopened.";
    case "score_saved":
      return "Score saved.";
    case "dispute_resolved":
      return "Dispute resolved.";
    default:
      return null;
  }
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase } = await assertAdminSupabase();
  const sp = await searchParams;
  const msg = typeof sp.msg === "string" ? sp.msg : null;
  const err = typeof sp.error === "string" ? sp.error : null;

  const { data: playersData } = await supabase
    .from("players")
    .select("*")
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });
  const players = (playersData ?? []) as Player[];

  const { data: matchesData } = await supabase
    .from("matches")
    .select("*")
    .order("created_at", { ascending: false });
  const matches = (matchesData ?? []) as Match[];

  const { data: scoresData } = await supabase.from("scores").select("*").order("created_at", { ascending: false });
  const scores = (scoresData ?? []) as Score[];

  const nameById = new Map(players.map((p) => [p.id, `${p.first_name} ${p.last_name}`]));
  const scoreByMatch = new Map(scores.map((s) => [s.match_id, s]));

  const disputed = matches.filter((m) => m.status === "disputed");

  return (
    <AppShell
      title="Admin"
      right={
        <ButtonLink href="/" variant="secondary" size="sm" className="whitespace-nowrap">
          Back to player mode
        </ButtonLink>
      }
    >
      <div className="space-y-4">
        {flashText(msg) ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            {flashText(msg)}
          </div>
        ) : null}
        {err ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</div>
        ) : null}

        <Card title="CSV export">
          <p className="text-sm text-muted">Downloads require an authenticated admin session.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <ButtonLink href="/api/admin/export?type=players" variant="secondary" className="w-full sm:w-auto">
              Players
            </ButtonLink>
            <ButtonLink href="/api/admin/export?type=matches" variant="secondary" className="w-full sm:w-auto">
              Matches
            </ButtonLink>
            <ButtonLink href="/api/admin/export?type=scores" variant="secondary" className="w-full sm:w-auto">
              Scores
            </ButtonLink>
          </div>
        </Card>

        <Card title="Players">
          <div className="space-y-4">
            {players.map((p) => (
              <form
                key={p.id}
                action={adminUpdatePlayer}
                className="rounded-2xl border border-border bg-background p-3 space-y-3"
              >
                <input type="hidden" name="id" value={p.id} />
                <p className="text-sm font-medium">
                  {p.first_name} {p.last_name}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="First name">
                    <Input name="first_name" defaultValue={p.first_name} required />
                  </Field>
                  <Field label="Last name">
                    <Input name="last_name" defaultValue={p.last_name} required />
                  </Field>
                  <Field label="Birth year">
                    <Input name="birth_year" type="number" defaultValue={p.birth_year} required />
                  </Field>
                  <Field label="Level">
                    <Input name="level" defaultValue={p.level} required />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Parent phone (optional)" hint="Digits only · leave blank if unused">
                      <Input name="parent_phone" defaultValue={p.parent_phone ?? ""} inputMode="tel" />
                    </Field>
                  </div>
                </div>
                <SubmitButton className="w-full sm:w-auto" pendingLabel="Saving…">
                  Save
                </SubmitButton>
              </form>
            ))}
          </div>
        </Card>

        <Card title="Matches">
          <div className="space-y-4">
            {matches.map((m) => {
              const reopenable = m.status === "declined" || m.status === "closed_by_other_acceptance";
              return (
                <div key={m.id} className="rounded-2xl border border-border bg-background p-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">
                      {nameById.get(m.player_a_id) ?? m.player_a_id} vs {nameById.get(m.player_b_id) ?? m.player_b_id}
                    </p>
                    <Link href={`/matches/${m.id}`} className="text-xs font-medium text-tennis-blue">
                      Open
                    </Link>
                  </div>
                  <p className="text-xs text-muted">ID: {m.id}</p>

                  <form action={adminUpdateMatchStatus} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <input type="hidden" name="id" value={m.id} />
                    <div className="flex-1 min-w-0">
                      <Field label="Status">
                        <Select name="status" defaultValue={m.status}>
                        {MATCH_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                        </Select>
                      </Field>
                    </div>
                    <SubmitButton pendingLabel="…" variant="secondary" className="w-full sm:w-40">
                      Update
                    </SubmitButton>
                  </form>

                  <form action={adminResetMatch} className="space-y-2">
                    <input type="hidden" name="id" value={m.id} />
                    <p className="text-xs text-muted">
                      Reset deletes the score row and clears workflow — this is the only way to unlock a completed
                      round-robin pairing for new invites or manual results.
                    </p>
                    <SubmitButton variant="danger" size="sm" className="w-full" pendingLabel="Resetting…">
                      Reset match (unlock pairing)
                    </SubmitButton>
                  </form>

                  {reopenable ? (
                    <form action={adminReopenInvitation} className="space-y-2 border-t border-border pt-3">
                      <input type="hidden" name="id" value={m.id} />
                      <Field label="Reopen invitation — inviter">
                        <Select name="inviter_player_id" required defaultValue={m.inviter_player_id ?? ""}>
                          <option value="" disabled>
                            Choose…
                          </option>
                          <option value={m.player_a_id}>{nameById.get(m.player_a_id)}</option>
                          <option value={m.player_b_id}>{nameById.get(m.player_b_id)}</option>
                        </Select>
                      </Field>
                      <SubmitButton variant="secondary" size="sm" className="w-full" pendingLabel="…">
                        Reopen invitation
                      </SubmitButton>
                    </form>
                  ) : null}
                </div>
              );
            })}
            {matches.length === 0 ? <p className="text-sm text-muted">No matches.</p> : null}
          </div>
        </Card>

        <Card title="Scores">
          <div className="space-y-4">
            {scores.map((s) => {
              const m = matches.find((x) => x.id === s.match_id);
              return (
                <div key={s.id} className="rounded-2xl border border-border bg-background p-3 space-y-3">
                  <p className="text-sm font-medium">
                    Match: {m ? `${nameById.get(m.player_a_id)} vs ${nameById.get(m.player_b_id)}` : s.match_id}
                  </p>
                  <p className="text-xs text-muted">
                    Score status: {s.score_status} {s.dispute_note ? `• Dispute: ${s.dispute_note}` : ""}
                  </p>
                  <form action={adminUpdateScoreText} className="space-y-2">
                    <input type="hidden" name="match_id" value={s.match_id} />
                    <Field label="Score display text">
                      <Input name="score_text" defaultValue={s.score_text} required />
                    </Field>
                    <SubmitButton className="w-full" pendingLabel="Saving…">
                      Save score line
                    </SubmitButton>
                  </form>
                </div>
              );
            })}
            {scores.length === 0 ? <p className="text-sm text-muted">No scores.</p> : null}
          </div>
        </Card>

        <div id="litiges">
          <Card title="Disputes">
            {disputed.length === 0 ? (
              <p className="text-sm text-muted">No open disputes.</p>
            ) : (
              <div className="space-y-4">
                {disputed.map((m) => {
                  const s = scoreByMatch.get(m.id);
                  return (
                    <div key={m.id} className="rounded-2xl border border-amber-200 bg-amber-50/40 p-3 space-y-3">
                      <p className="text-sm font-semibold">
                        {nameById.get(m.player_a_id)} vs {nameById.get(m.player_b_id)}
                      </p>
                      <p className="text-xs text-muted">
                        Current score: {s?.score_text ?? "—"} • Note: {s?.dispute_note ?? "—"}
                      </p>
                      <form action={adminResolveDispute} className="space-y-2">
                        <input type="hidden" name="match_id" value={m.id} />
                        <Field label="Corrected score line (marks resolved)">
                          <Input name="score_text" defaultValue={s?.score_text ?? ""} required minLength={3} />
                        </Field>
                        <SubmitButton className="w-full" pendingLabel="Saving…">
                          Apply & resolve
                        </SubmitButton>
                      </form>
                      <form action={adminMarkDisputeResolved}>
                        <input type="hidden" name="match_id" value={m.id} />
                        <SubmitButton variant="secondary" className="w-full" pendingLabel="…">
                          Keep text & resolve
                        </SubmitButton>
                      </form>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
