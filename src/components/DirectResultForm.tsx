"use client";

import { useMemo, useState } from "react";
import { publishDirectResult } from "@/app/actions/matches";
import { Button } from "@/components/ui/Button";
import { Field, Select, Input } from "@/components/ui/Field";
import type { Player } from "@/lib/db/types";

function canonicalSides(meId: string, oppId: string) {
  return meId < oppId
    ? { player_a_id: meId, player_b_id: oppId }
    : { player_a_id: oppId, player_b_id: meId };
}

export function DirectResultForm({ me, opponents }: { me: Player; opponents: Player[] }) {
  const defaultOpp = opponents[0]?.id ?? "";
  const [oppId, setOppId] = useState(defaultOpp);
  const [absence, setAbsence] = useState<string>("none");
  const showPlayed = absence === "none";

  const canonical = useMemo(() => canonicalSides(me.id, oppId), [me.id, oppId]);
  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    m.set(me.id, `${me.first_name} ${me.last_name}`.trim());
    for (const p of opponents) m.set(p.id, `${p.first_name} ${p.last_name}`.trim());
    return m;
  }, [me, opponents]);

  const na = canonical.player_a_id;
  const nb = canonical.player_b_id;
  const labelA = nameById.get(na) ?? "Player A";
  const labelB = nameById.get(nb) ?? "Player B";

  return (
    <form action={publishDirectResult} className="space-y-4">
      <Field label="Opponent">
        <Select name="opponent_id" required value={oppId} onChange={(e) => setOppId(e.target.value)}>
          {opponents.length === 0 ? (
            <option value="">No opponents</option>
          ) : (
            opponents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.first_name} {p.last_name}
              </option>
            ))
          )}
        </Select>
      </Field>

      <Field label="Outcome">
        <Select name="absence" required value={absence} onChange={(e) => setAbsence(e.target.value)}>
          <option value="none">Played match</option>
          <option value="player_a_absent">{labelA} absent — walkover ({labelB} wins)</option>
          <option value="player_b_absent">{labelB} absent — walkover ({labelA} wins)</option>
          <option value="both_absent">Both absent / cancelled</option>
        </Select>
      </Field>

      {showPlayed ? (
        <>
          <Field label="Winner">
            <Select name="winner_player_id" required>
              <option value="" disabled>
                Select winner…
              </option>
              <option value={na}>{labelA}</option>
              <option value={nb}>{labelB}</option>
            </Select>
          </Field>
          <Field
            label="Games won (open play)"
            hint={`Each segment: games for ${labelA}, then ${labelB} (same roster order as above). Example: 1:6 3:11 0:15`}
          >
            <Input name="open_games_score" required placeholder="1:6 3:11 0:15" autoComplete="off" />
          </Field>
        </>
      ) : (
        <>
          <input type="hidden" name="winner_player_id" value="" />
          <input type="hidden" name="open_games_score" value="" />
        </>
      )}

      <Field label="Match date/time (optional)">
        <Input type="datetime-local" name="match_date" />
      </Field>

      <Field label="Notes (optional)">
        <Input name="note" placeholder="Played outside the app …" />
      </Field>

      <Button type="submit" className="w-full" disabled={!oppId}>
        Publish result
      </Button>
    </form>
  );
}
