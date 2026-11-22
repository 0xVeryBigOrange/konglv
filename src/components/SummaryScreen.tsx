import { DIFFICULTY_LABEL, formatClock } from "../format.ts";
import type { SessionRecord } from "../types.ts";
import { Mark } from "./Mark.tsx";

const RATINGS = [
  { score: 1, label: "很难稳住" },
  { score: 2, label: "有点赶" },
  { score: 3, label: "一般" },
  { score: 4, label: "比较稳" },
  { score: 5, label: "很稳" },
];

type SummaryProps = {
  record: SessionRecord;
  onRate: (score: number) => void;
  onAgain: () => void;
  onHistory: () => void;
};

export function SummaryScreen({ record, onRate, onAgain, onHistory }: SummaryProps) {
  const selected = RATINGS.find((item) => item.score === record.rating);
  return (
    <main className="shell flex min-h-dvh flex-col px-5 pt-safe pb-safe">
      <div className="rise">
        <Mark />
        <p className="mt-5 text-xs tracking-[0.18em] text-brass">
          {record.completed ? "练习完成" : "已记下"}
        </p>
        <h1 className="mt-2 text-[2rem] leading-tight font-medium">
          {record.completed ? "这段练习完成了" : "这次提前结束了"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {DIFFICULTY_LABEL[record.difficulty]} · 计划 {record.durationMin} 分钟
          {record.bonusCount > 0 ? ` · 奖励挑战 ${record.bonusCount}` : ""}
        </p>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3">
        <Stat label="完成时长" value={formatClock(record.actualSec)} hint={`计划 ${formatClock(record.plannedSec)}`} />
        <Stat
          label="最长连续控制"
          value={formatClock(record.longestStretchSec)}
          hint={record.longestStretchSec === 0 ? "还没有进入连续节奏" : "节奏连续的最长时间"}
        />
        <Stat label="停下" value={`${record.stopCount}`} hint="计划中的停止" />
        <Stat label="快到了" value={`${record.panicCount}`} hint="主动按下的次数" />
      </dl>

      <section className="mt-7">
        <h2 className="text-sm text-faint">这次的控制感</h2>
        <div className="mt-3 grid grid-cols-5 gap-2" role="radiogroup" aria-label="控制感评分">
          {RATINGS.map((item) => {
            const on = record.rating === item.score;
            return (
              <button
                key={item.score}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={`${item.score} 分，${item.label}`}
                data-testid={`rating-${item.score}`}
                onClick={() => onRate(item.score)}
                className={`h-14 rounded-2xl border font-num text-xl ${
                  on ? "border-brass bg-brass text-ink" : "border-white/10 bg-panel text-cream"
                }`}
              >
                {item.score}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-muted">{selected ? selected.label : "选一个最接近的感觉。不评分也会保存。"}</p>
      </section>

      <div className="mt-auto grid grid-cols-2 gap-3 pt-8">
        <button type="button" className="btn btn-ghost" data-testid="summary-again" onClick={onAgain}>
          再练一次
        </button>
        <button type="button" className="btn btn-primary" data-testid="summary-history" onClick={onHistory}>
          查看进度
        </button>
      </div>
    </main>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-panel px-4 py-3">
      <dt className="text-xs text-faint">{label}</dt>
      <dd className="font-num mt-2 text-3xl leading-none text-cream">{value}</dd>
      <p className="mt-2 text-xs text-muted">{hint}</p>
    </div>
  );
}
