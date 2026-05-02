"use client";

import { useState } from "react";
import { Field, Select, Input } from "@/components/ui/Field";

export function ScoreEntryFormControls({
  playerAId,
  playerBId,
  nameA,
  nameB,
}: {
  playerAId: string;
  playerBId: string;
  nameA: string;
  nameB: string;
}) {
  const [absence, setAbsence] = useState<string>("none");
  const showPlayed = absence === "none";

  return (
    <div className="space-y-3">
      <Field label="Match outcome">
        <Select
          name="absence"
          required
          value={absence}
          onChange={(e) => setAbsence(e.target.value)}
        >
          <option value="none">Played match (normal result)</option>
          <option value="player_a_absent">{nameA} absent — walkover (winner: {nameB})</option>
          <option value="player_b_absent">{nameB} absent — walkover (winner: {nameA})</option>
          <option value="both_absent">Both absent / cancelled (no ranking points)</option>
        </Select>
      </Field>

      {showPlayed ? (
        <>
          <Field label="Winner">
            <Select name="winner_player_id" required={showPlayed}>
              <option value="" disabled>
                Select winner…
              </option>
              <option value={playerAId}>{nameA}</option>
              <option value={playerBId}>{nameB}</option>
            </Select>
          </Field>
          <Field
            label="Games won (open play)"
            hint={`Each segment is games for ${nameA} then ${nameB} (same order as above). Example: 1:6 3:11 0:15 — commas or spaces between segments.`}
          >
            <Input
              name="open_games_score"
              required={showPlayed}
              placeholder="1:6 3:11 0:15"
              autoComplete="off"
            />
          </Field>
        </>
      ) : (
        <>
          <input type="hidden" name="winner_player_id" value="" />
          <input type="hidden" name="open_games_score" value="" />
        </>
      )}

      <Field label="Notes (optional)">
        <Input name="note" placeholder="Any extra detail" />
      </Field>
    </div>
  );
}
