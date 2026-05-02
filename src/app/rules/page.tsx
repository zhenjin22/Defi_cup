import { AppShell } from "@/components/AppShell";

export default function RulesPage() {
  return (
    <AppShell title="Rules" right={null}>
      <div className="space-y-6 text-sm leading-relaxed">
        <p className="text-muted">
          Summer 2026 — juniors and families. Organisers may adjust wording for finals or special draws.
        </p>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-base font-semibold">Court &amp; parenting</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Parents do not go on court during the match.</li>
            <li>Children play independently and call their own lines in good faith.</li>
            <li>Children count points themselves; settle disagreements calmly.</li>
            <li>Respect, fair play, and good mood are mandatory.</li>
            <li>Bring your own balls.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-base font-semibold">Serve &amp; warm-up</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Serve must be overhand.</li>
            <li>
              Timing for the organised block: <strong>5 minutes</strong> warm-up ·{" "}
              <strong>50 minutes</strong> play · <strong>5 minutes</strong> to clean the court and redo lines.
            </li>
            <li>Match duration in the block line-up is 50 minutes.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-base font-semibold">Calling the score</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>The score must be announced loudly before each point.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-base font-semibold">No-Ad</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              At 40 / 40, the <strong>next point wins</strong> the game (no advantage).
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-base font-semibold">Booking a match</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              Reach out to another player from the group to organise a mutually agreeable time — then capture
              the court details in this app once agreed.
            </li>
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
