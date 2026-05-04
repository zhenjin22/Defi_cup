import type { Match, Score } from "@/lib/db/types";

/** Legacy preset keys (older rows) — labels only. */
export const FINAL_SCORE_PRESETS = [
  { key: "40_0", label: "40 / 0" },
  { key: "40_15", label: "40 / 15" },
  { key: "40_30", label: "40 / 30" },
  { key: "40_40_nd", label: "40 / 40 — No ad (next point wins)" },
] as const;

export type FinalScorePresetKey = (typeof FINAL_SCORE_PRESETS)[number]["key"];

export type ScoreAbsence =
  | "none"
  | "player_a_absent"
  | "player_b_absent"
  | "both_absent";

export const SCORE_ABSENCE_VALUES: ScoreAbsence[] = [
  "none",
  "player_a_absent",
  "player_b_absent",
  "both_absent",
];

export const FINAL_SCORE_PRESET_KEYS = FINAL_SCORE_PRESETS.map((p) => p.key);

export function presetLabel(key: string | null | undefined): string {
  if (!key) return "";
  const row = FINAL_SCORE_PRESETS.find((p) => p.key === key);
  return row?.label ?? key;
}

/** Human-readable line for rankings / match lists. */
export function normalizeLastNameVerify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Parse open-game score: each segment is games won by player A vs player B
 * (A = canonical `player_a_id`, B = `player_b_id`). Examples: `1:6 3:11 0:15`, `1-6, 3-11`.
 */
export function parseOpenGameScoreInput(raw: string): { pairs: [number, number][]; display: string } | null {
  const s = raw.trim().replace(/,/g, " ");
  const pairs: [number, number][] = [];
  const re = /\b(\d+)\s*[:/\-]\s*(\d+)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b < 0) return null;
    pairs.push([a, b]);
  }
  if (pairs.length === 0) return null;
  const display = pairs.map(([a, b]) => `${a}:${b}`).join(" ");
  return { pairs, display };
}

export type OpenGamesValidation =
  | { ok: true; display: string }
  | { ok: false; reason: "invalid_games" | "games_tie" | "winner_games_mismatch" };

export function validateOpenGamesForMatch(
  raw: string,
  winnerPlayerId: string,
  playerAId: string,
  playerBId: string,
): OpenGamesValidation {
  const parsed = parseOpenGameScoreInput(raw);
  if (!parsed) return { ok: false, reason: "invalid_games" };

  const sumA = parsed.pairs.reduce((acc, [a]) => acc + a, 0);
  const sumB = parsed.pairs.reduce((acc, [, b]) => acc + b, 0);
  if (sumA === sumB) return { ok: false, reason: "games_tie" };

  const expectedWinner = sumA > sumB ? playerAId : playerBId;
  if (expectedWinner !== winnerPlayerId) {
    return { ok: false, reason: "winner_games_mismatch" };
  }

  return { ok: true, display: parsed.display };
}

/** Build persisted score fields + display line for `score_text`. */
export function buildScoreDatabaseFields(
  match: { player_a_id: string; player_b_id: string },
  names: { a: string; b: string },
  input: {
    absence: ScoreAbsence;
    winner_player_id: string | null;
    open_games_score: string | null;
    note: string | null;
  },
): Pick<
  Score,
  "score_text" | "winner_player_id" | "final_score_preset" | "no_show_status" | "note"
> {
  const note = input.note?.trim() || null;

  if (input.absence === "both_absent") {
    return {
      score_text: "Cancelled — both players absent.",
      winner_player_id: null,
      final_score_preset: null,
      no_show_status: "both_absent",
      note,
    };
  }

  if (input.absence === "player_a_absent") {
    const winId = match.player_b_id;
    return {
      score_text: `Walkover: ${names.b} wins — ${names.a} absent.`,
      winner_player_id: winId,
      final_score_preset: null,
      no_show_status: "player_a_absent",
      note,
    };
  }

  if (input.absence === "player_b_absent") {
    const winId = match.player_a_id;
    return {
      score_text: `Walkover: ${names.a} wins — ${names.b} absent.`,
      winner_player_id: winId,
      final_score_preset: null,
      no_show_status: "player_b_absent",
      note,
    };
  }

  const winnerId = input.winner_player_id;
  const winName =
    winnerId === match.player_a_id ? names.a : winnerId === match.player_b_id ? names.b : "Winner";

  const gamesRaw = input.open_games_score?.trim() ?? "";
  const validated = winnerId
    ? validateOpenGamesForMatch(gamesRaw, winnerId, match.player_a_id, match.player_b_id)
    : { ok: false as const, reason: "invalid_games" as const };

  if (!winnerId || validated.ok !== true) {
    return {
      score_text: `${winName} won`,
      winner_player_id: winnerId,
      final_score_preset: null,
      no_show_status: "none",
      note,
    };
  }

  const display = validated.display;
  const line = `${display} — ${winName} won${note ? ` — ${note}` : ""}`;
  return {
    score_text: line,
    winner_player_id: winnerId,
    final_score_preset: null,
    no_show_status: "none",
    note,
  };
}

export function formatPublishedScore(params: {
  match: Pick<Match, "player_a_id" | "player_b_id">;
  score: Pick<Score, "score_text" | "winner_player_id" | "final_score_preset" | "note" | "no_show_status">;
  nameById: Map<string, string>;
}): string {
  const { match, score, nameById } = params;

  const aName = nameById.get(match.player_a_id) ?? "Player A";
  const bName = nameById.get(match.player_b_id) ?? "Player B";

  if (score.no_show_status === "both_absent") {
    return "Cancelled — both players absent.";
  }

  const winName = score.winner_player_id
    ? (nameById.get(score.winner_player_id) ?? "Winner")
    : null;

  if (score.no_show_status === "player_a_absent" && winName) {
    return `Walkover: ${winName} wins — ${aName} absent.`;
  }
  if (score.no_show_status === "player_b_absent" && winName) {
    return `Walkover: ${winName} wins — ${bName} absent.`;
  }

  const preset = presetLabel(score.final_score_preset ?? undefined);
  const base = score.score_text.trim();
  if (winName && preset) {
    return `${winName} won • Final game score: ${preset}${score.note ? ` — ${score.note}` : ""}`;
  }
  if (winName) {
    return `${winName} won${preset ? ` • ${preset}` : ""}${score.note ? ` — ${score.note}` : ""}`;
  }
  return base;
}

export type FormatMatrixScoreCellOpts = {
  /** True when matrix row is canonical player_b (vs player_a column): flip each stored A:B segment to B:A. */
  mirrorGameSegments?: boolean;
};

function formatMatrixGamesLine(
  parsed: NonNullable<ReturnType<typeof parseOpenGameScoreInput>>,
  mirrored: boolean,
): string {
  const pairs = mirrored
    ? parsed.pairs.map(([a, b]): [number, number] => [b, a])
    : parsed.pairs;
  return pairs.map(([a, b]) => `${a}:${b}`).join(" ").replace(/:/g, "-");
}

/** Short label for completed-match matrix cells (not full {@link formatPublishedScore} lines). */
export function formatMatrixScoreCell(
  score: Pick<Score, "score_text" | "no_show_status" | "final_score_preset"> | null | undefined,
  opts?: FormatMatrixScoreCellOpts,
): string {
  const mirrored = opts?.mirrorGameSegments ?? false;

  if (!score) return "Done";

  if (score.no_show_status === "both_absent") return "Cancelled";

  if (score.no_show_status === "player_a_absent" || score.no_show_status === "player_b_absent") {
    return "WO";
  }

  const trimmed = score.score_text.trim();
  if (!trimmed) return "Done";

  const head = trimmed.split(" — ")[0]?.trim() ?? "";
  const gamesHead = parseOpenGameScoreInput(head);
  if (gamesHead) {
    return formatMatrixGamesLine(gamesHead, mirrored);
  }

  if (score.final_score_preset) {
    const pl = presetLabel(score.final_score_preset);
    const presetHead = pl.split(/\s[—–]\s/)[0] ?? pl;
    const compact = presetHead.replace(/\s*\/\s*/g, "/").replace(/\s+/g, " ").trim();
    if (compact) return compact;
  }

  if (/walkover/i.test(trimmed)) return "WO";
  if (/cancelled/i.test(trimmed) && /both\s+players?\s+absent/i.test(trimmed)) return "Cancelled";

  const gamesWhole = parseOpenGameScoreInput(trimmed);
  if (gamesWhole) {
    return formatMatrixGamesLine(gamesWhole, mirrored);
  }

  return trimmed.length <= 14 ? trimmed : `${trimmed.slice(0, 13)}…`;
}
