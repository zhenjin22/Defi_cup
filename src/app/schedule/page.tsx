import Link from "next/link";
import { createInvitations } from "@/app/actions/matches";
import { claimAvailabilitySlot } from "@/app/actions/availability";
import { AppShell } from "@/components/AppShell";
import { ViewerControls } from "@/components/ViewerControls";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { AvailabilitySlot } from "@/lib/db/types";
import { formatCourtDetails } from "@/lib/court-display";
import { formatCalendarDayHeading, formatDateTime } from "@/lib/format";
import { matchStatusBadgeClass, matchStatusLabel } from "@/lib/match-copy-en";
import { lockedOpponentIdsForPlayer, opponentsWithActiveScheduling } from "@/lib/pair-lock";
import { fetchGroupAvailabilitySlots, fetchGroupMatches, fetchGroupPlayers } from "@/lib/queries";
import { DEFAULT_GROUP, getViewer } from "@/lib/viewer";

function slotVenueLine(s: AvailabilitySlot) {
  const parts: string[] = [];
  if (s.venue_name?.trim()) parts.push(s.venue_name.trim());
  if (s.court_number?.trim()) parts.push(`Court ${s.court_number.trim()}`);
  if (s.court_address_notes?.trim()) parts.push(s.court_address_notes.trim());
  return parts.join(" • ") || "Venue not specified";
}

function localDayKey(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA");
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { selectedPlayer } = await getViewer();
  if (!selectedPlayer) {
    const { redirect } = await import("next/navigation");
    redirect("/choose-child");
  }
  const me = selectedPlayer!;
  const players = await fetchGroupPlayers(DEFAULT_GROUP);
  const allMatches = await fetchGroupMatches(DEFAULT_GROUP);
  const allSlots = await fetchGroupAvailabilitySlots(DEFAULT_GROUP);
  const lockedOpp = lockedOpponentIdsForPlayer(me.id, allMatches);
  const schedulingBusy = opponentsWithActiveScheduling(me.id, allMatches);

  const nameById = new Map(players.map((p) => [p.id, `${p.first_name} ${p.last_name}`.trim()]));

  const claimable = allSlots.filter(
    (s) =>
      s.status === "open" &&
      s.player_id !== me.id &&
      !lockedOpp.has(s.player_id) &&
      !schedulingBusy.has(s.player_id),
  );

  const byDay = new Map<string, AvailabilitySlot[]>();
  for (const s of claimable) {
    const k = localDayKey(s.starts_at);
    const arr = byDay.get(k) ?? [];
    arr.push(s);
    byDay.set(k, arr);
  }
  for (const arr of byDay.values()) {
    arr.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }
  const sortedDayKeys = [...byDay.keys()].sort((a, b) => a.localeCompare(b));

  const opponentParam = typeof sp.opponent === "string" ? sp.opponent : null;
  const err = typeof sp.error === "string" ? sp.error : null;
  const scheduleError = (() => {
    switch (err) {
      case "invalid_form":
        return "Invalid form. Please retry.";
      case "max_active":
        return "You already have three invitations awaiting a reply.";
      case "pair_busy":
        return "That pairing already has an active booking or unfinished workflow.";
      case "pair_already_completed":
        return "That pairing is already complete (result on file). Only an admin reset can reopen it.";
      case "no_slot":
        return "Not enough invitation slots remaining.";
      case "invalid_slot":
        return "Invalid slot.";
      case "slot_not_found":
        return "That slot no longer exists.";
      case "slot_not_open":
        return "This slot is no longer open.";
      case "self_claim":
        return "You cannot claim your own child’s slot.";
      case "slot_taken":
        return "Someone else just claimed this slot. Refresh the page.";
      default:
        if (!err) return null;
        try {
          return decodeURIComponent(err);
        } catch {
          return err;
        }
    }
  })();

  const opponents = players.filter((p) => p.id !== me.id && !lockedOpp.has(p.id));

  const myScheduledNoCourt = allMatches.filter(
    (m) =>
      (m.player_a_id === me.id || m.player_b_id === me.id) &&
      m.status === "scheduled" &&
      !(m.court_reserved ?? false),
  );

  return (
    <AppShell title="Schedule" right={<ViewerControls />}>
      <div className="space-y-4">
        {scheduleError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{scheduleError}</div>
        ) : null}

        {myScheduledNoCourt.length > 0 ? (
          <Card title="Court not booked yet">
            <p className="text-sm text-muted">
              These matches are on the calendar but no parent has confirmed a reserved court yet.
            </p>
            <ul className="mt-3 space-y-2">
              {myScheduledNoCourt.map((m) => {
                const otherId = m.player_a_id === me.id ? m.player_b_id : m.player_a_id;
                const other = players.find((p) => p.id === otherId);
                const otherName = other ? `${other.first_name} ${other.last_name}` : "Opponent";
                const when = m.selected_time ? formatDateTime(m.selected_time) : "Time TBC";
                return (
                  <li key={m.id}>
                    <Link
                      href={`/matches/${m.id}`}
                      className="block rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 hover:bg-amber-100"
                    >
                      <span className="font-semibold">vs {otherName}</span>
                      <span className="mt-1 block text-xs text-amber-900">{when}</span>
                      <span className="mt-1 block text-xs">{formatCourtDetails(m)}</span>
                      <span
                        className={[
                          "mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                          matchStatusBadgeClass(m.status),
                        ].join(" ")}
                      >
                        {matchStatusLabel(m.status)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : null}

        <div className="rounded-xl border border-border bg-foreground/5 p-3 text-sm">
          <p className="font-semibold">Publish your times</p>
          <p className="mt-1 text-muted">Let other parents see when your child can play.</p>
          <ButtonLink href="/availability" className="mt-3 w-full text-center">
            My availability
          </ButtonLink>
        </div>

        <Card title="Available slots">
          <p className="text-sm text-muted">
            Open times from players you have not finished a result with yet, and you are not already scheduling with.
          </p>
          {claimable.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No open slots to show right now.</p>
          ) : (
            <div className="mt-4 space-y-6">
              {sortedDayKeys.map((dayKey) => {
                const daySlots = byDay.get(dayKey) ?? [];
                const headingIso = daySlots[0]?.starts_at ?? dayKey;
                return (
                  <section key={dayKey}>
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {formatCalendarDayHeading(headingIso)}
                    </h2>
                    <ul className="mt-2 space-y-3">
                      {daySlots.map((s) => {
                        const hostName = nameById.get(s.player_id) ?? "Player";
                        return (
                          <li
                            key={s.id}
                            className="rounded-2xl border border-border bg-background p-3 shadow-sm"
                          >
                            <p className="text-sm font-semibold">{hostName}</p>
                            <p className="mt-1 text-xs text-muted">
                              {formatDateTime(s.starts_at)} – {formatDateTime(s.ends_at)}
                            </p>
                            <p className="mt-2 text-sm leading-snug">{slotVenueLine(s)}</p>
                            <p className="mt-1 text-xs text-muted">
                              Court reserved when published: {s.court_reserved ? "Yes" : "No"}
                            </p>
                            <form action={claimAvailabilitySlot} className="mt-3">
                              <input type="hidden" name="slot_id" value={s.id} />
                              <SubmitButton className="w-full" pendingLabel="Claiming…">
                                Claim this slot
                              </SubmitButton>
                            </form>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Invite opponents (classic flow)">
          <p className="text-sm text-muted">
            You can still send direct invitations (max 3 awaiting reply). Players you already finished a result with are
            hidden.
          </p>
          <form action={createInvitations} className="mt-4 space-y-4">
            <Field label="Opponents" hint="Pick up to three for this wave">
              <div className="space-y-2">
                {opponents.length === 0 ? (
                  <p className="text-sm text-muted">No eligible opponents left to invite.</p>
                ) : null}
                {opponents.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2"
                  >
                    <span className="text-sm">
                      {p.first_name} {p.last_name} ({p.level})
                    </span>
                    <input
                      type="checkbox"
                      name="opponent_ids"
                      value={p.id}
                      defaultChecked={opponentParam === p.id}
                    />
                  </label>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-1 gap-3">
              <Field label="Slot 1">
                <Input type="datetime-local" name="time_1" required />
              </Field>
              <Field label="Slot 2">
                <Input type="datetime-local" name="time_2" required />
              </Field>
              <Field label="Slot 3 (optional)">
                <Input type="datetime-local" name="time_3" />
              </Field>
              <Field label="Slot 4 (optional)">
                <Input type="datetime-local" name="time_4" />
              </Field>
              <Field label="Slot 5 (optional)">
                <Input type="datetime-local" name="time_5" />
              </Field>
            </div>

            <Field label="Who handles the booking?">
              <Select name="booking_responsible" required>
                <option value="me">Me</option>
                <option value="opponent">The opponent parent</option>
                <option value="undecided">We’ll decide later</option>
              </Select>
            </Field>

            <SubmitButton className="w-full" pendingLabel="Sending…">
              Send invitations
            </SubmitButton>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
