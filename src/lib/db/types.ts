export type PlayerLevel = string; // e.g. "R5", "R6"

export type MatchStatus =
  | "waiting_response"
  | "accepted"
  | "declined"
  | "closed_by_other_acceptance"
  | "proposed"
  | "availability_confirmed"
  | "booking_failed"
  | "scheduled"
  | "published"
  | "disputed"
  | "resolved"
  | "not_scheduled";

export type BookingResponsible = "player_a" | "player_b" | "undecided";
export type BookingStatus = "not_started" | "pending" | "booked" | "failed";

export type Player = {
  id: string;
  first_name: string;
  last_name: string;
  birth_year: number;
  level: PlayerLevel;
  group_name: string;
  parent_email: string | null;
  parent_phone: string | null;
  created_at?: string;
};

export type Match = {
  id: string;
  player_a_id: string;
  player_b_id: string;
  inviter_player_id: string | null;
  status: MatchStatus;
  proposed_times: string[]; // timestamptz[] from Supabase
  opponent_available_times: string[];
  selected_time: string | null;
  court_name: string | null;
  court_number: string | null;
  court_address_notes: string | null;
  proposed_by: "player_a" | "player_b" | null;
  booking_responsible: BookingResponsible;
  booking_status: BookingStatus;
  created_at?: string;
};

export type NoShowStatus = "none" | "player_a_absent" | "player_b_absent" | "both_absent";

export type Score = {
  id: string;
  match_id: string;
  score_text: string;
  score_status: "published" | "disputed" | "resolved";
  winner_player_id: string | null;
  final_score_preset: string | null;
  no_show_status: NoShowStatus;
  disputed_by_player_id: string | null;
  dispute_note: string | null;
  disputed_at: string | null;
  note: string | null;
  created_at?: string;
};

