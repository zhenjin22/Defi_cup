"use client";

import { useActionState, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import type { Player } from "@/lib/db/types";
import { LOCAL_SELECTED_PLAYER_KEY } from "@/lib/app-constants";
import { enterChild, type EnterChildState } from "@/app/choose-child/actions";

function mapError(error: string | undefined) {
  switch (error) {
    case "invalid":
      return "Invalid selection. Please try again.";
    case "not_found":
      return "Player not found. Try again.";
    case "wrong_group":
      return "That player is not in this competition group.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export function ChooseChildClient({ players }: { players: Player[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(enterChild, null as EnterChildState);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      try {
        localStorage.setItem(LOCAL_SELECTED_PLAYER_KEY, state.playerId);
      } catch {
        // ignore
      }
      window.location.assign("/");
      return;
    }
    setMessage(mapError(state.error));
  }, [state]);

  return (
    <div className="space-y-4">
      <Card title="Choose your child">
        <p className="text-sm text-muted">Select your child&apos;s profile, then tap Enter.</p>
        {message ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {message}
          </div>
        ) : null}

        <form
          className="mt-4 space-y-4"
          action={formAction}
          onSubmit={() => {
            setMessage(null);
          }}
        >
          <Field label="Child">
            <Select name="player_id" required defaultValue="">
              <option value="" disabled>
                Select…
              </option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} ({p.birth_year})
                </option>
              ))}
            </Select>
          </Field>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Entering…" : "Enter"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
