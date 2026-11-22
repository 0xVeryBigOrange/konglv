import { useEffect, useRef, useState } from "react";
import { allowSleep, keepAwake, Metronome, silence, speak, vibrate } from "../cues.ts";
import { DIFFICULTY_LABEL, formatElapsedMs, formatRemainingMs } from "../format.ts";
import { phaseColor, phaseEyebrow } from "../plan.ts";
import type { Snapshot } from "../runner.ts";
import { SessionRunner } from "../runner.ts";
import type { Difficulty, DurationMin, Phase, SessionResult } from "../types.ts";
import { Sheet } from "./Sheet.tsx";

type SessionProps = {
  plan: Phase[];
  difficulty: Difficulty;
  durationMin: DurationMin;
  sound: boolean;
  vibrate: boolean;
  voice: boolean;
  onDone: (result: SessionResult) => void;
};

export function SessionScreen({
  plan,
  difficulty,
  durationMin,
  sound,
  vibrate: haptic,
  voice,
  onDone,
}: SessionProps) {
  const [runner] = useState(() => new SessionRunner(plan, durationMin * 60 * 1000, difficulty));
  const [metro] = useState(() => new Metronome());
  const [snap, setSnap] = useState<Snapshot>(() => runner.snapshot());
  const [beat, setBeat] = useState(0);
  const [pulsed, setPulsed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const snapRef = useRef(snap);
  const reported = useRef(false);
  const onDoneRef = useRef(onDone);
  const phaseId = useRef(snap.phase.id);
  const reportRef = useRef<(current: Snapshot) => void>(() => {});

  function resultOf(current: Snapshot): SessionResult {
    return {
      difficulty,
      durationMin,
      plannedSec: Math.round(current.plannedMs / 1000),
      actualSec: Math.max(1, Math.round(current.elapsedMs / 1000)),
      completed: !current.endedEarly,
      stopCount: current.stopCount,
      panicCount: current.panicCount,
      longestStretchSec: Math.round(current.longestStretchMs / 1000),
      bonusCount: current.bonusCount,
    };
  }

  useEffect(() => {
    snapRef.current = snap;
  }, [snap]);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    reportRef.current = (current: Snapshot) => {
      if (reported.current) return;
      reported.current = true;
      silence();
      metro.stop();
      onDoneRef.current(resultOf(current));
    };
  });

  useEffect(() => {
    let alive = true;
    metro.onBeat = () => {
      if (!alive) return;
      setBeat((value) => value + 1);
      setPulsed(true);
      window.setTimeout(() => {
        if (alive) setPulsed(false);
      }, 140);
    };
    void keepAwake();
    let frame = 0;
    let lastPaint = 0;
    const loop = (now: number) => {
      const next = runner.tick(now);
      if (now - lastPaint > 48 || next.finished || next.phase.id !== phaseId.current || next.paused !== snapRef.current.paused) {
        lastPaint = now;
        phaseId.current = next.phase.id;
        setSnap(next);
      }
      if (next.finished) reportRef.current(next);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    const onHide = () => {
      if (!document.hidden) return;
      runner.pause();
      silence();
      metro.stop();
      setSnap(runner.snapshot());
    };
    document.addEventListener("visibilitychange", onHide);

    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLButtonElement) return;
      if (event.key === " ") {
        event.preventDefault();
        const now = performance.now();
        if (snapRef.current.paused) runner.resume(now);
        else {
          runner.pause();
          silence();
        }
        setSnap(runner.snapshot());
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("keydown", onKey);
      metro.stop();
      silence();
      void allowSleep();
    };
  }, [runner, metro]);

  useEffect(() => {
    metro.setSound(sound);
    if (snap.paused || snap.finished || !snap.phase.bpm) {
      metro.stop();
      return;
    }
    metro.setBpm(snap.phase.bpm);
    metro.align();
    metro.start();
  }, [metro, snap.phase.id, snap.phase.bpm, snap.paused, snap.finished, sound]);

  useEffect(() => {
    if (snap.finished) return;
    speak(voice, `${snap.phase.title}。${snap.phase.detail}`);
    if (snap.phase.recovery && snap.phase.stop) return;
    vibrate(haptic, snap.phase.stop ? [18, 36, 18] : 12);
  }, [snap.phase.id, snap.finished, snap.phase.title, snap.phase.detail, snap.phase.recovery, snap.phase.stop, voice, haptic]);

  useEffect(() => {
    if (snap.paused) silence();
  }, [snap.paused]);

  const breathing =
    snap.phase.bpm === null && snap.phase.kind !== "kegel" && snap.phase.kind !== "relax";
  const breath = useBreath(breathing, snap.paused || snap.finished);
  const centerWord =
    snap.phase.kind === "kegel" ? "收紧" : snap.phase.kind === "relax" ? "松开" : breath;
  const color = phaseColor(snap.phase);
  const remain = Math.max(0, snap.phase.durationMs - snap.phaseElapsedMs);
  const progress = snap.phase.durationMs === 0 ? 0 : snap.phaseElapsedMs / snap.phase.durationMs;
  const overall = Math.min(1, snap.elapsedMs / snap.plannedMs);
  const radius = 84;
  const circumference = 2 * Math.PI * radius;

  function togglePause() {
    const now = performance.now();
    if (snap.paused) runner.resume(now);
    else {
      runner.pause();
      silence();
    }
    setSnap(runner.snapshot());
  }

  function onPanic() {
    vibrate(haptic, [24, 40, 24, 40, 70]);
    runner.panic();
    setSnap(runner.snapshot());
  }

  function confirmQuit() {
    runner.quit();
    const finalSnap = runner.snapshot();
    setSnap(finalSnap);
    reportRef.current(finalSnap);
  }

  return (
    <main className="shell relative flex h-dvh flex-col">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(540px 280px at 50% 22%, ${color}33, transparent 70%)`,
        }}
      />
      <header className="flex items-start justify-between px-5 pt-safe">
        <div>
          <p className="text-xs tracking-[0.18em] text-brass">{phaseEyebrow(snap.phase)}</p>
          <p className="mt-1 text-sm text-muted">
            {DIFFICULTY_LABEL[difficulty]} · {durationMin} 分钟
          </p>
        </div>
        <div className="text-right">
          <p className="font-num text-4xl leading-none text-cream" data-testid="session-clock">
            {formatElapsedMs(snap.elapsedMs)}
          </p>
          <p className="mt-1 text-xs text-faint tabular-nums">/ {formatElapsedMs(snap.plannedMs)}</p>
        </div>
      </header>
      <div
        className="mx-5 mt-4 h-1 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-label="整段进度"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(overall * 100)}
      >
        <div className="h-full rounded-full bg-brass" style={{ width: `${overall * 100}%` }} />
      </div>

      <section className="flex min-h-0 flex-1 flex-col items-center justify-center px-6">
        <div className="relative grid size-[clamp(168px,48vw,232px)] place-items-center">
          <svg viewBox="0 0 200 200" className="size-full -rotate-90">
            <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(244,240,230,0.1)" strokeWidth="8" />
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - Math.min(1, progress))}
              style={{ transition: "stroke-dashoffset 80ms linear" }}
            />
          </svg>
          <div className="absolute inset-[18%] grid place-items-center">
            {snap.phase.bpm && beat > 0 ? (
              <span
                key={beat}
                className="ripple"
                style={{
                  borderColor: color,
                  animationDuration: `${Math.min(0.9, 60 / snap.phase.bpm)}s`,
                }}
              />
            ) : null}
            <div
              className={`absolute inset-3 rounded-full ${breathing ? "breath-orb" : ""}`}
              style={{
                background: `radial-gradient(circle, ${color}66, transparent 68%)`,
                transform: snap.phase.bpm ? `scale(${pulsed ? 1.14 : 0.92})` : undefined,
                transition: "transform 120ms ease-out",
              }}
            />
            <div className="relative text-center">
              {snap.phase.bpm ? (
                <>
                  <p className="font-num text-5xl leading-none text-cream">{snap.phase.bpm}</p>
                  <p className="mt-1 text-xs tracking-widest text-faint">下 / 分</p>
                </>
              ) : (
                <p className="text-2xl text-cream">{centerWord}</p>
              )}
            </div>
          </div>
        </div>
        <p className={`mt-3 rounded-full px-3 py-1 text-xs ${snap.paused ? "bg-white/10 text-cream" : "invisible"}`}>
          已暂停
        </p>

        <div key={snap.phase.id} className="phase-in mt-6 max-w-sm text-center">
          <h1 className="text-[2rem] leading-tight font-medium text-cream" data-testid="phase-title">
            {snap.phase.title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted" data-testid="phase-detail">
            {snap.phase.detail}
          </p>
          <p className="mt-3 text-xs tabular-nums text-faint" data-testid="phase-remaining">
            这段还剩 {formatRemainingMs(remain)}
          </p>
        </div>
        <p className="sr-only" aria-live="polite">
          {snap.phase.title}。{snap.phase.detail}
        </p>
      </section>

      <footer className="space-y-3 px-5 pb-safe">
        <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-sm">
          <span className="text-faint">下一步</span>
          <span className="text-cream">{snap.next ? snap.next.title : "进入总结"}</span>
        </div>
        <button
          type="button"
          className={`btn w-full flex-col gap-0 ${snap.phase.recovery ? "btn-quiet" : "btn-panic"}`}
          data-testid="panic"
          onClick={onPanic}
        >
          <span className="text-lg">快到了</span>
          <span className="text-xs opacity-80">
            {snap.phase.recovery ? `已记下 ${snap.panicCount} 次` : "立刻停下，转入呼吸"}
          </span>
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="btn btn-ghost" data-testid="pause" onClick={togglePause}>
            {snap.paused ? "继续" : "暂停"}
          </button>
          <button type="button" className="btn btn-ghost" data-testid="quit" onClick={() => setConfirming(true)}>
            结束
          </button>
        </div>
      </footer>

      {confirming ? (
        <Sheet
          title="结束这次训练？"
          body="已经进行的时间、停下次数和「快到了」都会记下来。"
          confirmLabel="结束并总结"
          cancelLabel="继续训练"
          confirmTestId="quit-confirm"
          cancelTestId="quit-cancel"
          onCancel={() => setConfirming(false)}
          onConfirm={confirmQuit}
        />
      ) : null}
    </main>
  );
}

function useBreath(active: boolean, paused: boolean): string {
  const [label, setLabel] = useState("吸气");
  useEffect(() => {
    if (!active || paused) return;
    let cancelled = false;
    let timer = 0;
    const cycle = () => {
      if (cancelled) return;
      setLabel("吸气");
      timer = window.setTimeout(() => {
        if (cancelled) return;
        setLabel("呼气");
        timer = window.setTimeout(cycle, 6000);
      }, 4000);
    };
    cycle();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [active, paused]);
  return label;
}
