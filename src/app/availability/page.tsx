import { cancelAvailabilitySlot, createAvailabilitySlot } from "@/app/actions/availability";
import { AppShell } from "@/components/AppShell";
import { ViewerControls } from "@/components/ViewerControls";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { AvailabilitySlot } from "@/lib/db/types";
import { formatDateTime } from "@/lib/format";
import { fetchGroupAvailabilitySlots } from "@/lib/queries";
import { DEFAULT_GROUP, getViewer } from "@/lib/viewer";

function slotVenueLine(s: AvailabilitySlot) {
  const parts: string[] = [];
  if (s.venue_name?.trim()) parts.push(s.venue_name.trim());
  if (s.court_number?.trim()) parts.push(`Court ${s.court_number.trim()}`);
  if (s.court_address_notes?.trim()) parts.push(s.court_address_notes.trim());
  return parts.join(" • ") || "Venue not specified";
}

export default async function AvailabilityPage({
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
  const slots = await fetchGroupAvailabilitySlots(DEFAULT_GROUP);
  const mine = slots.filter((s) => s.player_id === me.id).sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  const err = typeof sp.error === "string" ? sp.error : null;
  const msg = typeof sp.msg === "string" ? sp.msg : null;
  const errorText =
    err === "invalid_slot"
      ? "Please check the form and try again."
      : err === "invalid_time_range"
        ? "End time must be after start time."
        : err
          ? decodeURIComponentSafe(err)
          : null;

  return (
    <AppShell title="My availability" right={<ViewerControls />}>
      <div className="space-y-4">
        {errorText ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{errorText}</div>
        ) : null}
        {msg === "slot_created" ? (
          <div className="rounded-xl border border-tennis-green/40 bg-tennis-green/10 p-3 text-sm text-foreground">
            Time slot published.
          </div>
        ) : null}
        {msg === "slot_cancelled" ? (
          <div className="rounded-xl border border-border bg-foreground/5 p-3 text-sm">Open slot cancelled.</div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            Other parents can claim an open slot if they have not played your child yet.
          </p>
          <ButtonLink href="/schedule" variant="secondary" className="shrink-0 text-center">
            Browse slots
          </ButtonLink>
        </div>

        <Card title="Add a time slot">
          <form action={createAvailabilitySlot} className="space-y-3">
            <Field label="Start" hint="Local date and time">
              <Input type="datetime-local" name="starts_at" required />
            </Field>
            <Field label="End">
              <Input type="datetime-local" name="ends_at" required />
            </Field>
            <Field label="Venue / club name (optional)">
              <Input name="venue_name" placeholder='e.g. "TC Plainpalais"' />
            </Field>
            <Field label="Court number (optional)">
              <Input name="court_number" placeholder="e.g. 3" />
            </Field>
            <Field label="Address or notes (optional)">
              <Input name="court_address_notes" placeholder="Directions, gate code…" />
            </Field>
            <label className="flex items-start gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm">
              <input type="checkbox" name="court_reserved" value="on" className="mt-1" />
              <span>
                <span className="font-medium">Court already reserved</span>
                <span className="mt-0.5 block text-xs text-muted">Tick if you have already booked this court.</span>
              </span>
            </label>
            <SubmitButton className="w-full" pendingLabel="Publishing…">
              Publish slot
            </SubmitButton>
          </form>
        </Card>

        <Card title="My available times">
          {mine.length === 0 ? (
            <p className="text-sm text-muted">You have no slots yet. Add one above.</p>
          ) : (
            <ul className="space-y-3">
              {mine.map((s) => (
                <li
                  key={s.id}
                  className="rounded-2xl border border-border bg-background p-3 text-sm leading-relaxed"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold">
                        {formatDateTime(s.starts_at)} – {formatDateTime(s.ends_at)}
                      </p>
                      <p className="mt-1 text-muted">{slotVenueLine(s)}</p>
                      <p className="mt-2 text-xs text-muted">
                        Status: <span className="font-medium capitalize text-foreground">{s.status}</span>
                        {s.status === "claimed" && s.claimed_by_player_id ? (
                          <> · claimed by another player</>
                        ) : null}
                        {s.court_reserved ? <> · court marked reserved when published</> : null}
                      </p>
                    </div>
                    {s.status === "open" ? (
                      <form action={cancelAvailabilitySlot} className="shrink-0">
                        <input type="hidden" name="slot_id" value={s.id} />
                        <SubmitButton variant="secondary" className="w-full sm:w-auto" pendingLabel="…">
                          Cancel slot
                        </SubmitButton>
                      </form>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
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
