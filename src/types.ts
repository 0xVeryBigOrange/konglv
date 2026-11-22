export type Difficulty = "easy" | "normal" | "hard";

export type DurationMin = 5 | 10 | 15 | 20;

export type PhaseKind =
  | "prepare"
  | "warmup"
  | "steady"
  | "accelerate"
  | "edge"
  | "decelerate"
  | "stop"
  | "breathe"
  | "kegel"
  | "relax"
  | "cooldown";

export type Phase = {
  id: string;
  kind: PhaseKind;
  title: string;
  detail: string;
  bpm: number | null;
  durationMs: number;
  /** Counts toward the longest controlled stretch. */
  control: boolean;
  /** A programmed full stop. Recovery stops are excluded from the stop tally. */
  stop: boolean;
  bonus: boolean;
  recovery: boolean;
  /** Retargeting will not change this phase length. */
  locked: boolean;
};

export type Prefs = {
  difficulty: Difficulty;
  durationMin: DurationMin;
  sound: boolean;
  vibrate: boolean;
  voice: boolean;
  bonus: boolean;
};

export type SessionResult = {
  difficulty: Difficulty;
  durationMin: DurationMin;
  plannedSec: number;
  actualSec: number;
  completed: boolean;
  stopCount: number;
  panicCount: number;
  longestStretchSec: number;
  bonusCount: number;
};

export type SessionRecord = SessionResult & {
  id: string;
  completedAt: number;
  rating: number | null;
};
