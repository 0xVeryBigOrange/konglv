import { dayKey } from "./format.ts";
import type { SessionRecord } from "./types.ts";

export function computeStreak(records: SessionRecord[], now = new Date()): number {
  const days = new Set(records.map((record) => dayKey(new Date(record.completedAt))));
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function startOfWeek(now: Date): Date {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = start.getDay();
  const diff = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - diff);
  return start;
}

export function sessionsThisWeek(records: SessionRecord[], now = new Date()): number {
  const start = startOfWeek(now).getTime();
  return records.filter((record) => record.completedAt >= start).length;
}

export function totalMinutes(records: SessionRecord[]): number {
  const seconds = records.reduce((sum, record) => sum + record.actualSec, 0);
  return Math.round(seconds / 60);
}

export function averageRating(records: SessionRecord[]): number | null {
  const rated = records.filter((record) => record.rating !== null);
  if (rated.length === 0) return null;
  const sum = rated.reduce((total, record) => total + (record.rating ?? 0), 0);
  return Math.round((sum / rated.length) * 10) / 10;
}
