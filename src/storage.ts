import type { Difficulty, DurationMin, Prefs, SessionRecord } from "./types.ts";

const AGE_KEY = "konglv.age.v1";
const PREF_KEY = "konglv.prefs.v1";
const HIST_KEY = "konglv.history.v1";

export const DEFAULT_PREFS: Prefs = {
  difficulty: "normal",
  durationMin: 10,
  sound: true,
  vibrate: true,
  voice: false,
  bonus: true,
};

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode or a full quota */
  }
}

export function loadAge(): boolean {
  return read(AGE_KEY) === "ok";
}

export function saveAge() {
  write(AGE_KEY, "ok");
}

function isDifficulty(value: unknown): value is Difficulty {
  return value === "easy" || value === "normal" || value === "hard";
}

function isDuration(value: unknown): value is DurationMin {
  return value === 5 || value === 10 || value === 15 || value === 20;
}

export function loadPrefs(): Prefs {
  const raw = read(PREF_KEY);
  if (!raw) return { ...DEFAULT_PREFS };
  try {
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return {
      difficulty: isDifficulty(parsed.difficulty) ? parsed.difficulty : DEFAULT_PREFS.difficulty,
      durationMin: isDuration(parsed.durationMin) ? parsed.durationMin : DEFAULT_PREFS.durationMin,
      sound: typeof parsed.sound === "boolean" ? parsed.sound : DEFAULT_PREFS.sound,
      vibrate: typeof parsed.vibrate === "boolean" ? parsed.vibrate : DEFAULT_PREFS.vibrate,
      voice: typeof parsed.voice === "boolean" ? parsed.voice : DEFAULT_PREFS.voice,
      bonus: typeof parsed.bonus === "boolean" ? parsed.bonus : DEFAULT_PREFS.bonus,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs: Prefs) {
  write(PREF_KEY, JSON.stringify(prefs));
}

function isRecord(value: unknown): value is SessionRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<SessionRecord>;
  return (
    typeof record.id === "string" &&
    typeof record.completedAt === "number" &&
    isDifficulty(record.difficulty) &&
    isDuration(record.durationMin) &&
    typeof record.plannedSec === "number" &&
    typeof record.actualSec === "number" &&
    typeof record.completed === "boolean" &&
    typeof record.stopCount === "number" &&
    typeof record.panicCount === "number" &&
    typeof record.longestStretchSec === "number" &&
    typeof record.bonusCount === "number" &&
    (record.rating === null ||
      (typeof record.rating === "number" && record.rating >= 1 && record.rating <= 5))
  );
}

export function loadHistory(): SessionRecord[] {
  const raw = read(HIST_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecord).sort((a, b) => b.completedAt - a.completedAt);
  } catch {
    return [];
  }
}

export function saveSession(record: SessionRecord) {
  const history = loadHistory().filter((item) => item.id !== record.id);
  history.unshift(record);
  write(HIST_KEY, JSON.stringify(history.slice(0, 200)));
}

export function updateRating(id: string, rating: number) {
  if (rating < 1 || rating > 5) return;
  const history = loadHistory();
  const next = history.map((record) => (record.id === id ? { ...record, rating } : record));
  write(HIST_KEY, JSON.stringify(next));
}

export function clearHistory() {
  write(HIST_KEY, "[]");
}
