import type { Difficulty, DurationMin, Phase, PhaseKind } from "./types.ts";

export type Rng = () => number;

export type PlanOptions = {
  difficulty: Difficulty;
  durationMin: DurationMin;
  bonus: boolean;
  rng?: Rng;
};

export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let sequence = 0;

function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}${sequence}`;
}

function int(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}

type Draft = {
  kind: PhaseKind;
  title: string;
  detail: string;
  bpm: number | null;
  seconds: number;
  control: boolean;
  stop?: boolean;
  bonus?: boolean;
  recovery?: boolean;
  locked?: boolean;
};

function toPhase(draft: Draft, prefix: string): Phase {
  return {
    id: nextId(prefix),
    kind: draft.kind,
    title: draft.title,
    detail: draft.detail,
    bpm: draft.bpm,
    durationMs: draft.seconds * 1000,
    control: draft.control,
    stop: draft.stop ?? false,
    bonus: draft.bonus ?? false,
    recovery: draft.recovery ?? false,
    locked: draft.locked ?? false,
  };
}

function sum(phases: Phase[]): number {
  return phases.reduce((total, phase) => total + phase.durationMs, 0);
}

const SLOW_START = [
  "从很慢的节奏开始，动作轻，呼吸不要屏住。",
  "先用很轻的速度找稳定，不要急着加快。",
];
const STEADY = [
  "维持这个速度。注意力只放在节奏是否均匀。",
  "保持现在的速度。如果变乱，就回到这一拍。",
];
const FASTER = [
  "在还能稳住的范围内渐渐加快，不要一下子冲到最快。",
  "稍稍加快，仍然保持均匀，留有可以停下的余地。",
];
const HOLD = [
  "放慢一点，守住现在的感觉。想加速时，先保持这个速度。",
  "停在这个速度上。感觉变强时，用呼吸把它托住。",
];
const SLOWER = [
  "慢慢降下来，幅度变小，呼吸放长。",
  "逐渐减速。让这一段比上一段更轻。",
];
const STOP = [
  "立刻停止动作。松开双手、肩膀和下巴。",
  "完全停下。手离开，先把呼吸放慢。",
];
const BREATH = [
  "用鼻子吸气，再用嘴更慢地呼出。呼气要比吸气长。",
  "吸气时放松腹部，呼气时把气送长一点。",
];

function movement(
  rng: Rng,
  kind: PhaseKind,
  title: string,
  details: readonly string[],
  bpmMin: number,
  bpmMax: number,
  secMin: number,
  secMax: number,
): Draft {
  return {
    kind,
    title,
    detail: pick(rng, details),
    bpm: int(rng, bpmMin, bpmMax),
    seconds: int(rng, secMin, secMax),
    control: true,
  };
}

function stopPhase(rng: Rng, min: number, max: number): Draft {
  return {
    kind: "stop",
    title: "停下放松",
    detail: pick(rng, STOP),
    bpm: null,
    seconds: int(rng, min, max),
    control: false,
    stop: true,
  };
}

function breathePhase(rng: Rng, min: number, max: number): Draft {
  return {
    kind: "breathe",
    title: "深呼吸",
    detail: pick(rng, BREATH),
    bpm: null,
    seconds: int(rng, min, max),
    control: false,
  };
}

function kegelPhase(seconds: number): Draft {
  return {
    kind: "kegel",
    title: `收紧盆底肌 ${seconds} 秒`,
    detail: "像轻轻停住尿意那样向内收紧，保持住，不要憋气。",
    bpm: null,
    seconds,
    control: false,
    locked: true,
  };
}

function relaxPhase(seconds: number): Draft {
  return {
    kind: "relax",
    title: "放松盆底",
    detail: "完全松开盆底，继续缓慢呼吸。",
    bpm: null,
    seconds,
    control: false,
    locked: true,
  };
}

function makeCycle(difficulty: Difficulty, rng: Rng, variant: number): Draft[] {
  if (difficulty === "easy") {
    if (variant === 0) {
      return [
        movement(rng, "warmup", "慢起", SLOW_START, 42, 50, 16, 20),
        movement(rng, "steady", "保持", STEADY, 52, 62, 16, 22),
        movement(rng, "accelerate", "加速", FASTER, 64, 76, 12, 16),
        movement(rng, "decelerate", "减速", SLOWER, 46, 56, 10, 14),
        stopPhase(rng, 12, 16),
        breathePhase(rng, 14, 18),
      ];
    }
    return [
      kegelPhase(int(rng, 5, 6)),
      relaxPhase(6),
      movement(rng, "warmup", "慢起", SLOW_START, 42, 50, 14, 18),
      movement(rng, "steady", "保持", STEADY, 52, 62, 14, 20),
      movement(rng, "edge", "守住", HOLD, 44, 54, 10, 14),
      stopPhase(rng, 12, 16),
      breathePhase(rng, 12, 16),
    ];
  }

  if (difficulty === "normal") {
    if (variant === 0) {
      return [
        movement(rng, "warmup", "慢起", SLOW_START, 54, 64, 10, 14),
        movement(rng, "steady", "保持", STEADY, 70, 84, 12, 16),
        movement(rng, "accelerate", "加速", FASTER, 90, 104, 10, 13),
        movement(rng, "edge", "守住", HOLD, 60, 72, 8, 12),
        movement(rng, "decelerate", "减速", SLOWER, 52, 64, 8, 10),
        stopPhase(rng, 8, 12),
        breathePhase(rng, 10, 14),
      ];
    }
    return [
      movement(rng, "steady", "保持", STEADY, 72, 86, 12, 16),
      movement(rng, "accelerate", "加速", FASTER, 92, 106, 8, 12),
      movement(rng, "decelerate", "减速", SLOWER, 56, 68, 8, 10),
      kegelPhase(8),
      relaxPhase(6),
      movement(rng, "edge", "守住", HOLD, 58, 70, 8, 12),
      stopPhase(rng, 8, 11),
      breathePhase(rng, 10, 13),
    ];
  }

  if (variant === 0) {
    return [
      movement(rng, "accelerate", "加速", FASTER, 100, 114, 7, 9),
      movement(rng, "steady", "保持", STEADY, 88, 100, 7, 9),
      movement(rng, "accelerate", "加速", FASTER, 110, 124, 6, 8),
      movement(rng, "edge", "守住", HOLD, 76, 90, 6, 8),
      stopPhase(rng, 6, 8),
      breathePhase(rng, 8, 10),
    ];
  }
  if (variant === 1) {
    return [
      movement(rng, "warmup", "慢起", SLOW_START, 70, 82, 6, 8),
      movement(rng, "accelerate", "加速", FASTER, 108, 122, 6, 8),
      movement(rng, "decelerate", "减速", SLOWER, 72, 86, 6, 8),
      stopPhase(rng, 6, 8),
      breathePhase(rng, 8, 10),
      movement(rng, "accelerate", "加速", FASTER, 104, 120, 6, 8),
      movement(rng, "edge", "守住", HOLD, 78, 92, 6, 8),
      stopPhase(rng, 6, 8),
    ];
  }
  return [
    movement(rng, "steady", "保持", STEADY, 90, 104, 7, 9),
    movement(rng, "accelerate", "加速", FASTER, 112, 124, 6, 8),
    movement(rng, "edge", "守住", HOLD, 80, 94, 6, 8),
    movement(rng, "decelerate", "减速", SLOWER, 68, 80, 6, 7),
    kegelPhase(10),
    stopPhase(rng, 6, 8),
    breathePhase(rng, 8, 10),
  ];
}

function makeBonus(rng: Rng): Draft {
  const choice = int(rng, 0, 4);
  if (choice === 0) {
    const bpm = int(rng, 40, 52);
    return {
      kind: "steady",
      title: "半速保持",
      detail: `把节奏降到大约每分钟 ${bpm} 下，保持均匀，直到这段结束。`,
      bpm,
      seconds: int(rng, 18, 22),
      control: true,
      bonus: true,
      locked: true,
    };
  }
  if (choice === 1) {
    return {
      kind: "breathe",
      title: "静止呼吸",
      detail: "完全停下。吸气数四下，呼气数六下，重复到这段结束。",
      bpm: null,
      seconds: int(rng, 20, 24),
      control: false,
      bonus: true,
      locked: true,
    };
  }
  if (choice === 2) {
    return {
      kind: "kegel",
      title: "盆底三连",
      detail: "收紧盆底肌 5 秒，放松 3 秒，一共三次。不要憋气。",
      bpm: null,
      seconds: 24,
      control: false,
      bonus: true,
      locked: true,
    };
  }
  if (choice === 3) {
    return {
      kind: "steady",
      title: "慢数二十",
      detail: "用每分钟 40 下的速度，在心里数满二十下，然后自然停下。",
      bpm: 40,
      seconds: 30,
      control: true,
      bonus: true,
      locked: true,
    };
  }
  return {
    kind: "breathe",
    title: "呼气收紧",
    detail: "吸气时放松盆底，呼气时轻轻收紧，再随着下一次吸气松开。",
    bpm: null,
    seconds: 20,
    control: false,
    bonus: true,
    locked: true,
  };
}

function retarget(phases: Phase[], targetMs: number) {
  let cursor = 0;
  let guard = 0;
  while (guard < 20000) {
    const diff = targetMs - sum(phases);
    if (Math.abs(diff) < 500) {
      const pool = phases.filter((phase) => !phase.locked);
      if (pool.length === 0) return;
      const host = pool.reduce((best, phase) =>
        phase.durationMs > best.durationMs ? phase : best,
      );
      const next = host.durationMs + diff;
      if (next >= 5000 && next <= 32000) host.durationMs = next;
      return;
    }
    const growing = diff > 0;
    const pool = phases.filter((phase) => {
      if (phase.locked) return false;
      return growing ? phase.durationMs <= 31000 : phase.durationMs >= 6000;
    });
    if (pool.length === 0) return;
    const host = pool[cursor % pool.length]!;
    host.durationMs += growing ? 1000 : -1000;
    cursor += 1;
    guard += 1;
  }
}

export function buildPlan(options: PlanOptions): Phase[] {
  const rng = options.rng ?? Math.random;
  const target = options.durationMin * 60 * 1000;
  const introBpm = options.difficulty === "easy" ? 46 : options.difficulty === "normal" ? 56 : 66;
  const phases: Phase[] = [
    toPhase(
      {
        kind: "prepare",
        title: "准备",
        detail: "找一个能放松的姿势。随后跟随指令改变节奏。疼痛或不适就马上停止。",
        bpm: introBpm,
        seconds: 12,
        control: false,
      },
      "p",
    ),
  ];

  const outro = toPhase(
    {
      kind: "cooldown",
      title: "松开",
      detail: "练习结束。完全停下，做几次更长的呼气，让身体松开。",
      bpm: null,
      seconds: 16,
      control: false,
    },
    "p",
  );

  let used = phases[0]!.durationMs + outro.durationMs;
  const variants = options.difficulty === "hard" ? 3 : 2;
  let lastVariant = -1;
  let cycle = 0;

  while (cycle < 40) {
    let variant = int(rng, 0, variants - 1);
    if (variant === lastVariant) variant = (variant + 1) % variants;
    lastVariant = variant;
    const block = makeCycle(options.difficulty, rng, variant).map((draft) => toPhase(draft, "p"));
    const every = options.difficulty === "easy" ? 3 : 2;
    const wantBonus = options.bonus && (cycle + 1) % every === 0;
    const bonus = wantBonus ? toPhase(makeBonus(rng), "b") : null;
    const extra = sum(block) + (bonus ? bonus.durationMs : 0);
    if (cycle > 0 && used + extra > target + 20_000) break;
    phases.push(...block);
    used += sum(block);
    if (bonus && used + bonus.durationMs <= target + 20_000) {
      phases.push(bonus);
      used += bonus.durationMs;
    }
    cycle += 1;
    if (used >= target - 8_000) break;
  }

  if (!phases.some((phase) => phase.kind === "kegel")) {
    const seconds = options.difficulty === "easy" ? 6 : options.difficulty === "normal" ? 8 : 10;
    phases.push(toPhase(kegelPhase(seconds), "p"), toPhase(relaxPhase(6), "p"));
  }

  if (options.bonus && !phases.some((phase) => phase.bonus)) {
    phases.push(toPhase(makeBonus(rng), "b"));
  }

  phases.push(outro);
  retarget(phases, target);
  return phases;
}

export function buildRecovery(difficulty: Difficulty): Phase[] {
  const stop = difficulty === "easy" ? 16 : difficulty === "normal" ? 12 : 10;
  const breath = difficulty === "easy" ? 20 : difficulty === "normal" ? 16 : 14;
  return [
    toPhase(
      {
        kind: "stop",
        title: "停下放松",
        detail: "立刻停下。把注意力放到脚底，或者只数自己的呼气。",
        bpm: null,
        seconds: stop,
        control: false,
        stop: true,
        recovery: true,
        locked: true,
      },
      "r",
    ),
    toPhase(
      {
        kind: "breathe",
        title: "深呼吸",
        detail: "慢慢吸气，再更慢地呼气。肩膀放下。",
        bpm: null,
        seconds: breath,
        control: false,
        recovery: true,
        locked: true,
      },
      "r",
    ),
    toPhase(
      {
        kind: "relax",
        title: "放松盆底",
        detail: "确认盆底是松的。如果还在用力，就再松开一次。",
        bpm: null,
        seconds: 8,
        control: false,
        recovery: true,
        locked: true,
      },
      "r",
    ),
  ];
}

export function phaseEyebrow(phase: Phase): string {
  if (phase.recovery) return "恢复";
  if (phase.bonus) return "奖励挑战";
  switch (phase.kind) {
    case "prepare":
      return "开始";
    case "warmup":
      return "热身";
    case "steady":
      return "稳定";
    case "accelerate":
      return "加快";
    case "edge":
      return "守住";
    case "decelerate":
      return "放慢";
    case "stop":
      return "停止";
    case "breathe":
      return "呼吸";
    case "kegel":
      return "盆底";
    case "relax":
      return "松开";
    case "cooldown":
      return "结束";
  }
}

export function phaseColor(phase: Phase): string {
  if (phase.recovery || phase.kind === "stop") return "#e58b73";
  if (phase.kind === "breathe" || phase.kind === "relax" || phase.kind === "cooldown") {
    return "#8fd0c4";
  }
  if (phase.kind === "kegel") return "#c4b2ef";
  if (phase.kind === "accelerate") return "#e6b15a";
  if (phase.kind === "decelerate" || phase.kind === "warmup" || phase.kind === "prepare") {
    return "#9ebbe8";
  }
  return "#f0d7a2";
}
