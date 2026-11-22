import { buildRecovery } from "./plan.ts";
import type { Difficulty, Phase } from "./types.ts";

export type Snapshot = {
  phase: Phase;
  phaseIndex: number;
  phaseElapsedMs: number;
  elapsedMs: number;
  plannedMs: number;
  paused: boolean;
  stopCount: number;
  panicCount: number;
  longestStretchMs: number;
  currentStretchMs: number;
  bonusCount: number;
  finished: boolean;
  endedEarly: boolean;
  next: Phase | null;
};

export class SessionRunner {
  private phases: Phase[];
  private index = 0;
  private phaseElapsed = 0;
  private elapsed = 0;
  private paused = false;
  private stopCount = 0;
  private panicCount = 0;
  private bonusCount = 0;
  private stretch = 0;
  private longest = 0;
  private finished = false;
  private endedEarly = false;
  private started = false;
  private lastNow: number | null = null;
  readonly plannedMs: number;
  private readonly difficulty: Difficulty;

  constructor(phases: Phase[], plannedMs: number, difficulty: Difficulty) {
    this.phases = phases.map((phase) => ({ ...phase }));
    this.plannedMs = plannedMs;
    this.difficulty = difficulty;
  }

  pause() {
    if (this.finished) return;
    this.paused = true;
  }

  resume(now: number) {
    this.paused = false;
    this.lastNow = now;
  }

  panic() {
    if (this.finished) return;
    this.panicCount += 1;
    const current = this.phases[this.index];
    if (!current || current.recovery) return;
    this.commitStretch();
    const recovery = buildRecovery(this.difficulty);
    this.phases.splice(this.index, 1, ...recovery);
    this.enterPhase();
  }

  quit() {
    this.finish(true);
  }

  tick(now: number): Snapshot {
    if (!this.started) {
      this.started = true;
      this.lastNow = now;
      this.enterPhase();
      return this.snapshot();
    }
    const dt = Math.min(1000, Math.max(0, now - (this.lastNow ?? now)));
    this.lastNow = now;
    if (!this.paused && !this.finished) this.advance(dt);
    return this.snapshot();
  }

  snapshot(): Snapshot {
    const index = Math.min(this.index, Math.max(0, this.phases.length - 1));
    const phase = this.phases[index]!;
    return {
      phase,
      phaseIndex: index,
      phaseElapsedMs: this.phaseElapsed,
      elapsedMs: this.elapsed,
      plannedMs: this.plannedMs,
      paused: this.paused,
      stopCount: this.stopCount,
      panicCount: this.panicCount,
      longestStretchMs: Math.max(this.longest, this.stretch),
      currentStretchMs: this.stretch,
      bonusCount: this.bonusCount,
      finished: this.finished,
      endedEarly: this.endedEarly,
      next: this.index + 1 < this.phases.length ? this.phases[this.index + 1]! : null,
    };
  }

  private advance(dt: number) {
    let left = dt;
    while (left > 0 && !this.finished) {
      const phase = this.phases[this.index];
      if (!phase) {
        this.finish(false);
        return;
      }
      const remain = phase.durationMs - this.phaseElapsed;
      const step = Math.min(remain, left);
      this.phaseElapsed += step;
      this.elapsed += step;
      if (phase.control && !phase.recovery) this.stretch += step;
      left -= step;
      if (this.phaseElapsed >= phase.durationMs - 0.001) {
        this.index += 1;
        if (this.index >= this.phases.length) {
          this.finish(false);
          return;
        }
        this.enterPhase();
      }
    }
  }

  private enterPhase() {
    const phase = this.phases[this.index];
    if (!phase) {
      this.finish(false);
      return;
    }
    this.phaseElapsed = 0;
    if (!phase.control) this.commitStretch();
    if (phase.stop && !phase.recovery) this.stopCount += 1;
    if (phase.bonus) this.bonusCount += 1;
  }

  private commitStretch() {
    if (this.stretch > this.longest) this.longest = this.stretch;
    this.stretch = 0;
  }

  private finish(early: boolean) {
    if (this.finished) return;
    this.commitStretch();
    this.finished = true;
    this.endedEarly = early;
  }
}
