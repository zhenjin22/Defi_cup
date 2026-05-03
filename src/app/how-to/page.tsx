import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";

export default function HowToPage() {
  return (
    <AppShell title="How To" right={null}>
      <div className="space-y-4">
        <p className="text-sm text-muted">
          A short guide to scheduling, courts, and results — mobile-friendly.
        </p>

        <Card title="Step 1 — Choose your child">
          <p className="text-sm leading-relaxed">
            Select your child once. The app remembers your selection.
          </p>
        </Card>

        <Card title="Step 2 — Publish your available times">
          <p className="text-sm leading-relaxed">
            Go to <strong>Availability</strong>. Add times when your child can play. You can already indicate if a court
            is booked.
          </p>
        </Card>

        <Card title={"Step 3 — Claim another player's slot"}>
          <p className="text-sm leading-relaxed">
            Go to <strong>Schedule</strong>. Choose an available opponent. Claim a suitable time slot.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Only players you have not already played can be selected.
          </p>
        </Card>

        <Card title="Step 4 — Book the court">
          <p className="text-sm leading-relaxed">
            After a match is paired, either parent can add the court information.
          </p>
          <p className="mt-2 text-sm leading-relaxed">
            If the court is not booked, the app will highlight: <strong>Court not booked yet</strong>.
          </p>
        </Card>

        <Card title="Step 5 — Play the match">
          <p className="text-sm leading-relaxed">
            Children play independently. Parents stay outside the court.
          </p>
        </Card>

        <Card title="Step 6 — Enter the result">
          <p className="text-sm leading-relaxed">
            After the match, open the match detail page. Enter the score using the usual score form.
          </p>
        </Card>

        <Card title="Step 7 — Check ranking">
          <p className="text-sm leading-relaxed">Ranking and matrix update automatically.</p>
        </Card>
      </div>
    </AppShell>
  );
}
