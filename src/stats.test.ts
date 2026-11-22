import assert from "node:assert/strict";
import { test } from "node:test";
import { clearHistory, loadHistory, saveSession, updateRating } from "./storage.ts";
import { averageRating, computeStreak, sessionsThisWeek } from "./stats.ts";
import type { SessionRecord } from "./types.ts";

const memory = new Map<string, string>();

globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => {
    memory.set(key, value);
  },
  removeItem: (key) => {
    memory.delete(key);
  },
  clear: () => memory.clear(),
  key: (index) => [...memory.keys()][index] ?? null,
  get length() {
    return memory.size;
  },
};

function record(partial: Partial<SessionRecord> & Pick<SessionRecord, "id" | "completedAt">): SessionRecord {
  return {
    difficulty: "normal",
    durationMin: 10,
    plannedSec: 600,
    actualSec: 600,
    completed: true,
    stopCount: 4,
    panicCount: 1,
    longestStretchSec: 70,
    bonusCount: 1,
    rating: 4,
    ...partial,
  };
}

test("streak counts today or yesterday backward", () => {
  const now = new Date(2026, 10, 22, 21, 0, 0);
  const day = (date: number, hour = 12) => new Date(2026, 10, date, hour).getTime();
  assert.equal(
    computeStreak(
      [record({ id: "a", completedAt: day(22) }), record({ id: "b", completedAt: day(21) }), record({ id: "c", completedAt: day(20) })],
      now,
    ),
    3,
  );
  assert.equal(
    computeStreak([record({ id: "a", completedAt: day(21) }), record({ id: "b", completedAt: day(20) })], now),
    2,
  );
  assert.equal(computeStreak([record({ id: "a", completedAt: day(20) })], now), 0);
  assert.equal(computeStreak([], now), 0);
});

test("week count starts on Monday", () => {
  const now = new Date(2026, 10, 22, 21, 0, 0);
  const records = [
    record({ id: "mon", completedAt: new Date(2026, 10, 16, 9).getTime() }),
    record({ id: "sun-before", completedAt: new Date(2026, 10, 15, 9).getTime() }),
    record({ id: "today", completedAt: new Date(2026, 10, 22, 9).getTime() }),
  ];
  assert.equal(sessionsThisWeek(records, now), 2);
});

test("history persists ratings and ignores corrupt data", () => {
  memory.clear();
  const saved = record({ id: "s1", completedAt: 1, rating: null });
  saveSession(saved);
  updateRating("s1", 5);
  assert.equal(loadHistory()[0]?.rating, 5);
  assert.equal(averageRating(loadHistory()), 5);
  localStorage.setItem("konglv.history.v1", "{not json");
  assert.deepEqual(loadHistory(), []);
  saveSession(saved);
  clearHistory();
  assert.deepEqual(loadHistory(), []);
});
