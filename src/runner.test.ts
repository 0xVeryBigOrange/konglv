import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPlan, mulberry32 } from "./plan.ts";
import { SessionRunner } from "./runner.ts";

test("a full session finishes and records stops and the longest stretch", () => {
  const plan = buildPlan({
    difficulty: "normal",
    durationMin: 5,
    bonus: true,
    rng: mulberry32(8),
  });
  const planned = plan.reduce((sum, phase) => sum + phase.durationMs, 0);
  const runner = new SessionRunner(plan, 5 * 60 * 1000, "normal");
  let now = 0;
  let snap = runner.tick(now);
  while (!snap.finished && now < 30 * 60 * 1000) {
    now += 250;
    snap = runner.tick(now);
  }
  assert.equal(snap.finished, true);
  assert.equal(snap.endedEarly, false);
  assert.ok(snap.stopCount > 0);
  assert.ok(snap.longestStretchMs > 0);
  assert.ok(Math.abs(snap.elapsedMs - planned) < 50);
});

test("pause freezes the clock and resume continues", () => {
  const plan = buildPlan({
    difficulty: "easy",
    durationMin: 5,
    bonus: false,
    rng: mulberry32(2),
  });
  const runner = new SessionRunner(plan, 5 * 60 * 1000, "easy");
  let now = 1_000;
  runner.tick(now);
  now += 2_000;
  const before = runner.tick(now);
  runner.pause();
  now += 5_000;
  const paused = runner.tick(now);
  assert.equal(paused.paused, true);
  assert.equal(paused.elapsedMs, before.elapsedMs);
  runner.resume(now);
  now += 1_000;
  const after = runner.tick(now);
  assert.ok(after.elapsedMs >= before.elapsedMs + 900);
});

test("panic starts recovery, logs every press, and still reaches the cooldown", () => {
  const plan = buildPlan({
    difficulty: "easy",
    durationMin: 10,
    bonus: false,
    rng: mulberry32(3),
  });
  const runner = new SessionRunner(plan, 10 * 60 * 1000, "easy");
  let now = 0;
  let snap = runner.tick(now);
  let guard = 0;
  while (!snap.phase.control && guard < 800) {
    now += 200;
    snap = runner.tick(now);
    guard += 1;
  }
  now += 1_500;
  snap = runner.tick(now);
  assert.equal(snap.phase.control, true);
  const stretchBefore = snap.currentStretchMs;
  assert.ok(stretchBefore > 0);
  runner.panic();
  snap = runner.snapshot();
  assert.equal(snap.panicCount, 1);
  assert.equal(snap.phase.recovery, true);
  assert.equal(snap.phase.title, "停下放松");
  assert.ok(snap.longestStretchMs >= stretchBefore);
  runner.panic();
  assert.equal(runner.snapshot().panicCount, 2);
  assert.equal(runner.snapshot().phase.recovery, true);

  const seen = new Set<string>();
  while (!runner.snapshot().finished && now < 40 * 60 * 1000) {
    seen.add(runner.snapshot().phase.title);
    now += 500;
    runner.tick(now);
  }
  seen.add(runner.snapshot().phase.title);
  assert.equal(runner.snapshot().finished, true);
  assert.ok(seen.has("松开"));
  assert.ok(seen.has("放松盆底"));
});

test("quitting ends the session early", () => {
  const plan = buildPlan({
    difficulty: "hard",
    durationMin: 5,
    bonus: true,
    rng: mulberry32(11),
  });
  const runner = new SessionRunner(plan, 5 * 60 * 1000, "hard");
  runner.tick(0);
  runner.tick(4_000);
  runner.quit();
  const snap = runner.snapshot();
  assert.equal(snap.finished, true);
  assert.equal(snap.endedEarly, true);
  assert.ok(snap.elapsedMs < 10_000);
});
