import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPlan, mulberry32 } from "./plan.ts";
import type { Difficulty, DurationMin } from "./types.ts";

const BANNED = ["射精", "撸", "鸡巴", "阴茎", "乳头", "睾丸", "高潮", "色情", "淫"];

test("plans stay inside the requested duration and use plain language", () => {
  const difficulties: Difficulty[] = ["easy", "normal", "hard"];
  const durations: DurationMin[] = [5, 10, 15, 20];
  for (const difficulty of difficulties) {
    for (const durationMin of durations) {
      for (let seed = 1; seed <= 6; seed += 1) {
        const plan = buildPlan({
          difficulty,
          durationMin,
          bonus: true,
          rng: mulberry32(seed * 97 + durationMin),
        });
        const total = plan.reduce((sum, phase) => sum + phase.durationMs, 0);
        const ratio = total / (durationMin * 60 * 1000);
        assert.ok(
          ratio > 0.92 && ratio < 1.08,
          `${difficulty} ${durationMin} seed ${seed} ratio ${ratio.toFixed(3)}`,
        );
        assert.ok(plan.some((phase) => phase.title === "停下放松"));
        assert.ok(plan.some((phase) => phase.kind === "breathe" || phase.kind === "cooldown"));
        assert.ok(plan.some((phase) => phase.kind === "kegel" || phase.title === "盆底三连"));
        assert.ok(plan.some((phase) => phase.bonus));
        assert.equal(plan[0]?.kind, "prepare");
        assert.equal(plan.at(-1)?.kind, "cooldown");
        for (const phase of plan) {
          assert.ok(phase.durationMs >= 5000 && phase.durationMs <= 32000);
          assert.ok(phase.bpm === null || (phase.bpm >= 36 && phase.bpm <= 128));
          if (phase.stop) {
            assert.equal(phase.bpm, null);
            assert.equal(phase.control, false);
          }
          const text = `${phase.title}${phase.detail}`;
          for (const word of BANNED) {
            assert.ok(!text.includes(word), text);
          }
        }
      }
    }
  }
});

test("bonus challenges can be turned off", () => {
  const plan = buildPlan({
    difficulty: "normal",
    durationMin: 15,
    bonus: false,
    rng: mulberry32(4),
  });
  assert.equal(
    plan.some((phase) => phase.bonus),
    false,
  );
});

test("harder plans are faster and stop for less time", () => {
  function means(difficulty: Difficulty) {
    let bpm = 0;
    let bpmCount = 0;
    let stop = 0;
    let stopCount = 0;
    for (let seed = 1; seed <= 10; seed += 1) {
      const plan = buildPlan({
        difficulty,
        durationMin: 10,
        bonus: false,
        rng: mulberry32(seed + 20),
      });
      for (const phase of plan) {
        if (phase.control && phase.bpm && !phase.bonus) {
          bpm += phase.bpm;
          bpmCount += 1;
        }
        if (phase.stop && !phase.recovery) {
          stop += phase.durationMs;
          stopCount += 1;
        }
      }
    }
    return { bpm: bpm / bpmCount, stop: stop / stopCount };
  }
  const easy = means("easy");
  const normal = means("normal");
  const hard = means("hard");
  assert.ok(easy.bpm < normal.bpm);
  assert.ok(normal.bpm < hard.bpm);
  assert.ok(easy.stop > hard.stop);
});
