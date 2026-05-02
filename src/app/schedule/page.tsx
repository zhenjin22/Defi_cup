import { createInvitations } from "@/app/actions/matches";
import { AppShell } from "@/components/AppShell";
import { ViewerControls } from "@/components/ViewerControls";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { fetchGroupMatches, fetchGroupPlayers } from "@/lib/queries";
import { lockedOpponentIdsForPlayer } from "@/lib/pair-lock";
import { DEFAULT_GROUP, getViewer } from "@/lib/viewer";

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
  const lockedOpp = lockedOpponentIdsForPlayer(me.id, allMatches);

  const opponentParam = typeof sp.opponent === "string" ? sp.opponent : null;
  const err = typeof sp.error === "string" ? sp.error : null;
  const scheduleError = (() => {
    switch (err) {
      case "invalid_form":
        return "Invalid form. Please retry.";
      case "max_active":
        return "You already have three invitations awaiting a reply.";
      case "pair_busy":
        return "One of those pairings already has an active booking or unfinished workflow.";
      case "pair_already_completed":
        return "That pairing is already complete (result on file). Only an admin reset can reopen it.";
      case "no_slot":
        return "Not enough invitation slots remaining.";
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

  return (
    <AppShell title="Schedule" right={<ViewerControls />}>
      <div className="space-y-4">
        {scheduleError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{scheduleError}</div>
        ) : null}
        <Card title="Invite opponents (max 3 awaiting reply)">
          <p className="text-sm text-muted">
            Players you already finished a result with are hidden — each pairing happens only once unless an admin
            resets the match.
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
