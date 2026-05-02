import type { Match, Player, Score } from "./types";

export type RankingRow = {
  playerId: string;
  playerName: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  points: number;
  scoreDiff: number; // games won - games lost
  remainingMatches: number;
};

/** Pairs (games for player A, games for player B) per segment — open play. Accepts `1:6`, `1-6`, `1/6`, comma or space separated. */
function parseSets(scoreText: string): Array<[number, number]> {
  const normalized = scoreText.replace(/,/g, " ");
  const out: Array<[number, number]> = [];
  const re = /\b(\d+)\s*[:/\-]\s*(\d+)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalized)) !== null) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (Number.isFinite(a) && Number.isFinite(b) && a >= 0 && b >= 0) {
      out.push([a, b]);
    }
  }
  return out;
}

/** Fallback winner from parsed segments: total games won (A vs B). */
export function computeWinnerFromScore(scoreText: string): "a" | "b" | null {
  const sets = parseSets(scoreText);
  if (sets.length === 0) return null;

  let aGames = 0;
  let bGames = 0;
  for (const [a, b] of sets) {
    aGames += a;
    bGames += b;
  }

  if (aGames === bGames) return null;
  return aGames > bGames ? "a" : "b";
}

export function computeGamesDiff(scoreText: string): number {
  const sets = parseSets(scoreText);
  return sets.reduce((acc, [a, b]) => acc + (a - b), 0);
}

function winnerSideFromScore(
  match: Match,
  score: Score,
): "a" | "b" | null {
  if (score.no_show_status === "both_absent") return null;

  if (score.winner_player_id === match.player_a_id) return "a";
  if (score.winner_player_id === match.player_b_id) return "b";

  return computeWinnerFromScore(score.score_text);
}

export function computeRanking(params: {
  players: Player[];
  matches: Match[];
  scoresByMatchId: Map<string, Score>;
}): RankingRow[] {
  const { players, matches, scoresByMatchId } = params;

  const rows = new Map<string, RankingRow>();
  for (const p of players) {
    rows.set(p.id, {
      playerId: p.id,
      playerName: `${p.first_name} ${p.last_name}`.trim(),
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      points: 0,
      scoreDiff: 0,
      remainingMatches: 0,
    });
  }

  const countedStatuses = new Set<Match["status"]>([
    "published",
    "disputed",
    "resolved",
  ]);

  const countedMatches = matches.filter((m) => countedStatuses.has(m.status));
  for (const m of countedMatches) {
    const score = scoresByMatchId.get(m.id);
    if (!score) continue;

    if (score.no_show_status === "both_absent") {
      continue;
    }

    const rowA = rows.get(m.player_a_id);
    const rowB = rows.get(m.player_b_id);
    if (!rowA || !rowB) continue;

    rowA.matchesPlayed += 1;
    rowB.matchesPlayed += 1;

    let gamesDiff = computeGamesDiff(score.score_text);
    if (gamesDiff === 0 && score.no_show_status !== "none") {
      gamesDiff = 2;
    }

    rowA.scoreDiff += gamesDiff;
    rowB.scoreDiff -= gamesDiff;

    const winner = winnerSideFromScore(m, score);
    if (winner === "a") {
      rowA.wins += 1;
      rowB.losses += 1;
      rowA.points += 3;
      rowB.points += 1;
    } else if (winner === "b") {
      rowB.wins += 1;
      rowA.losses += 1;
      rowB.points += 3;
      rowA.points += 1;
    }
  }

  const totalOpponents = Math.max(0, players.length - 1);
  for (const r of rows.values()) {
    r.remainingMatches = Math.max(0, totalOpponents - r.matchesPlayed);
  }

  return [...rows.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.scoreDiff !== a.scoreDiff) return b.scoreDiff - a.scoreDiff;
    return a.playerName.localeCompare(b.playerName);
  });
}
