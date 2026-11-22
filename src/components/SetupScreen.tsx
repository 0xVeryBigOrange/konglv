import { DIFFICULTY_LABEL } from "../format.ts";
import type { Difficulty, DurationMin, Prefs } from "../types.ts";
import { Mark } from "./Mark.tsx";

const DURATIONS: DurationMin[] = [5, 10, 15, 20];

const DIFFICULTIES: {
  id: Difficulty;
  hint: string;
  copy: string;
}[] = [
  {
    id: "easy",
    hint: "约 42–76 下/分",
    copy: "节奏更慢，停下和呼吸更久。适合第一次。",
  },
  {
    id: "normal",
    hint: "约 54–106 下/分",
    copy: "加速、守住和停下交替，节奏适中。",
  },
  {
    id: "hard",
    hint: "约 68–124 下/分",
    copy: "切换更快，稳定段更短，需要更频繁地守住。",
  },
];

type SetupProps = {
  prefs: Prefs;
  streak: number;
  onChange: (prefs: Prefs) => void;
  onStart: () => void;
  onHistory: () => void;
};

export function SetupScreen({ prefs, streak, onChange, onStart, onHistory }: SetupProps) {
  return (
    <main className="shell flex h-dvh flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-safe pb-4">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Mark className="size-7" />
              <p className="text-xs tracking-[0.2em] text-brass">控律</p>
            </div>
            <h1 className="mt-3 text-[1.7rem] leading-tight font-medium">准备这次训练</h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              {streak > 0 ? `已连续练习 ${streak} 天。` : "从一段短练习开始，熟悉停下和呼吸。"}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost mt-1 min-h-11 px-4"
            data-testid="nav-history"
            onClick={onHistory}
          >
            进度
          </button>
        </header>

        <ol className="mt-5 space-y-2 rounded-3xl border border-white/10 bg-panel/80 px-4 py-3 text-sm leading-6 text-muted">
          <li>1. 屏幕会告诉你加速、保持、减速，或停下放松。</li>
          <li>2. 有节拍时跟着圆圈起伏；停下时松开，做深呼吸。</li>
          <li>3. 快要守不住时按「快到了」，会立刻转入恢复。</li>
        </ol>

        <section className="mt-5">
          <h2 className="text-sm text-faint">难度</h2>
          <div className="mt-3 space-y-2.5" role="radiogroup" aria-label="难度">
            {DIFFICULTIES.map((item) => {
              const selected = prefs.difficulty === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  data-testid={`difficulty-${item.id}`}
                  onClick={() => onChange({ ...prefs, difficulty: item.id })}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    selected ? "border-brass bg-brass/10" : "border-white/10 bg-panel"
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-lg text-cream">{DIFFICULTY_LABEL[item.id]}</span>
                    <span className="text-xs text-faint">{item.hint}</span>
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-muted">{item.copy}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-5">
          <h2 className="text-sm text-faint">时长</h2>
          <div className="mt-3 grid grid-cols-4 gap-2" role="radiogroup" aria-label="时长">
            {DURATIONS.map((minutes) => {
              const selected = prefs.durationMin === minutes;
              return (
                <button
                  key={minutes}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  data-testid={`duration-${minutes}`}
                  onClick={() => onChange({ ...prefs, durationMin: minutes })}
                  className={`rounded-2xl border py-3 ${
                    selected ? "border-brass bg-brass/10 text-cream" : "border-white/10 bg-panel text-muted"
                  }`}
                >
                  <span className="font-num block text-[1.6rem] leading-none">{minutes}</span>
                  <span className="mt-1 block text-[11px] text-faint">分钟</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-5 divide-y divide-white/10">
          <Toggle
            title="节拍声音"
            description="按当前速度给出很轻的滴答声。"
            checked={prefs.sound}
            testId="toggle-sound"
            onChange={(sound) => onChange({ ...prefs, sound })}
          />
          <Toggle
            title="振动提示"
            description="阶段切换时短振。部分手机浏览器不支持。"
            checked={prefs.vibrate}
            testId="toggle-vibrate"
            onChange={(vibrate) => onChange({ ...prefs, vibrate })}
          />
          <Toggle
            title="语音朗读"
            description="用中文读出当前指令。请留意周围的音量。"
            checked={prefs.voice}
            testId="toggle-voice"
            onChange={(voice) => onChange({ ...prefs, voice })}
          />
          <Toggle
            title="奖励挑战"
            description="练习中偶尔插入一段额外的控制任务。"
            checked={prefs.bonus}
            testId="toggle-bonus"
            onChange={(bonus) => onChange({ ...prefs, bonus })}
          />
        </section>
        <p className="mt-4 text-xs leading-5 text-faint">设置和记录只保存在这台设备上，不会上传。</p>
      </div>
      <div className="shrink-0 border-t border-white/10 px-5 pt-3 pb-safe">
        <button type="button" className="btn btn-primary w-full" data-testid="start-session" onClick={onStart}>
          开始 {prefs.durationMin} 分钟
        </button>
      </div>
    </main>
  );
}

function Toggle({
  title,
  description,
  checked,
  testId,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  testId: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-cream">{title}</p>
        <p className="mt-0.5 text-sm leading-6 text-faint">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        data-testid={testId}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition ${checked ? "bg-brass" : "bg-white/15"}`}
      >
        <span
          className={`absolute top-1 size-6 rounded-full transition ${
            checked ? "left-7 bg-ink" : "left-1 bg-cream"
          }`}
        />
      </button>
    </div>
  );
}
