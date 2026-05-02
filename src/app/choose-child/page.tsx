import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ChooseChildClient } from "@/components/ChooseChildClient";
import { fetchGroupPlayers } from "@/lib/queries";
import { DEFAULT_GROUP, getViewer } from "@/lib/viewer";

export default async function ChooseChildPage() {
  const { selectedPlayer } = await getViewer();
  if (selectedPlayer) redirect("/");

  const players = await fetchGroupPlayers(DEFAULT_GROUP);

  return (
    <div className="min-h-screen bg-background">
      <AppShell title="Welcome" right={null}>
        <ChooseChildClient players={players} />
      </AppShell>
    </div>
  );
}
