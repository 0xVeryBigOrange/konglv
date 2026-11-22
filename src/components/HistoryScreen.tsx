import { useState } from "react";
import { DIFFICULTY_LABEL, formatClock, formatWhen } from "../format.ts";
import { loadHistory } from "../storage.ts";
import { averageRating, computeStreak, sessionsThisWeek, totalMinutes } from "../stats.ts";
import type { SessionRecord } from "../types.ts";
import { Sheet } from "./Sheet.tsx";

type HistoryProps = {
  onBack: () => void;
  onClear: () => void;
};

export function HistoryScreen({ onBack, onClear }: HistoryProps) {
  const [records, setRecords] = useState<SessionRecord[]>(() => loadHistory());
  const [confirming, setConfirming] = useState(false);
  const streak = computeStreak(records);
  const week = sessionsThisWeek(records);
  const seconds = records.reduce((sum, record) => sum + record.actualSec, 0);
  const practice = seconds < 60 ? "不到 1 分钟" : `${totalMinutes(records)} 分钟`;
  const average = averageRating(records);
  const points = [...records]
    .filter((record) => record.rating !== null)
    .sort((a, b) => a.completedAt - b.completedAt)
    .slice(-14);

  return (
    <main className="shell min-h-dvh px-5 pt-safe pb-safe">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.18em] text-brass">进度</p>
          <h1 className="mt-2 text-[1.7rem] font-medium">练习记录</h1>
        </div>
        <button type="button" className="btn btn-ghost min-h-11 px-4" data-testid="nav-back" onClick={onBack}>
          返回
        </button>
      </header>

      <section className="mt-6 rounded-3xl border border-white/10 bg-panel px-5 py-5">
        <p className="text-sm text-faint">连续练习</p>
        <p className="mt-2 flex items-end gap-2">
          <span className="font-num text-6xl leading-none text-cream">{streak}</span>
          <span className="mb-1 text-muted">天</span>
        </p>
        <p className="mt-3 text-sm leading-6 text-muted">
          {records.length === 0
            ? "今天完成一次，连续天数就从 1 开始。"
            : `本周 ${week} 次 · 累计 ${practice}${average !== null ? ` · 平均控制感 ${average}` : ""}`}
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm text-faint">控制感</h2>
        <div className="mt-3 rounded-3xl border border-white/10 bg-panel px-3 py-4">
          <TrendChart points={points.map((record) => ({ at: record.completedAt, rating: record.rating ?? 0 }))} />
          <p className="px-2 text-xs leading-5 text-faint">纵轴是 1 到 5 的自评。最近 14 次有评分的练习。</p>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-sm text-faint">每一次</h2>
        {records.length === 0 ? (
          <div className="mt-3 rounded-3xl border border-dashed border-white/15 px-5 py-10 text-center" data-testid="history-empty">
            <p className="text-cream">还没有练习记录</p>
            <p className="mt-2 text-sm leading-6 text-muted">完成一次后，连续天数和控制感会显示在这里。</p>
          </div>
        ) : (
          <ul className="mt-3 space-y-2.5" data-testid="history-list">
            {records.map((record) => (
              <li key={record.id} className="rounded-2xl border border-white/10 bg-panel px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-cream">{formatWhen(record.completedAt)}</p>
                  <p className="text-sm text-brass">{record.rating ? `${record.rating} 分` : "未评分"}</p>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {DIFFICULTY_LABEL[record.difficulty]} · {formatClock(record.actualSec)} / {record.durationMin} 分钟 ·{" "}
                  {record.completed ? "完成" : "提前结束"}
                </p>
                <p className="mt-1 text-sm text-faint">
                  停下 {record.stopCount} · 快到了 {record.panicCount} · 最长控制 {formatClock(record.longestStretchSec)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {records.length > 0 ? (
        <button
          type="button"
          className="btn btn-ghost mt-6 w-full"
          data-testid="clear-history"
          onClick={() => setConfirming(true)}
        >
          清除本机记录
        </button>
      ) : null}

      {confirming ? (
        <Sheet
          title="清除全部练习记录？"
          body="连续天数、评分和每次摘要都会从这台设备删除。年龄确认会保留。"
          confirmLabel="清除"
          cancelLabel="取消"
          danger
          confirmTestId="clear-confirm"
          cancelTestId="clear-cancel"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            onClear();
            setRecords([]);
            setConfirming(false);
          }}
        />
      ) : null}
    </main>
  );
}

function TrendChart({ points }: { points: { at: number; rating: number }[] }) {
  if (points.length === 0) {
    return <p className="px-2 pb-3 text-sm text-muted">评过分的练习会连成一条趋势。</p>;
  }
  const width = 320;
  const height = 150;
  const padX = 18;
  const padY = 16;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const coords = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : padX + (innerW * index) / (points.length - 1);
    const y = padY + ((5 - point.rating) / 4) * innerH;
    return { ...point, x, y };
  });
  const path = coords
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="控制感趋势">
      {[1, 3, 5].map((score) => {
        const y = padY + ((5 - score) / 4) * innerH;
        return (
          <g key={score}>
            <line x1={padX} x2={width - padX} y1={y} y2={y} stroke="rgba(244,240,230,0.1)" />
            <text x="2" y={y + 4} fill="#8d877c" fontSize="10">
              {score}
            </text>
          </g>
        );
      })}
      {coords.length > 1 ? (
        <path d={path} fill="none" stroke="#e6b15a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      ) : null}
      {coords.map((point) => (
        <circle key={point.at} cx={point.x} cy={point.y} r="4.5" fill="#171b24" stroke="#e6b15a" strokeWidth="2" />
      ))}
    </svg>
  );
}
