import { useState } from "react";
import { AgeGate, Underage } from "./components/AgeGate.tsx";
import { HistoryScreen } from "./components/HistoryScreen.tsx";
import { SessionScreen } from "./components/SessionScreen.tsx";
import { SetupScreen } from "./components/SetupScreen.tsx";
import { SummaryScreen } from "./components/SummaryScreen.tsx";
import { unlockAudio, unlockVoice, vibrate } from "./cues.ts";
import { buildPlan } from "./plan.ts";
import { computeStreak } from "./stats.ts";
import {
  clearHistory,
  loadAge,
  loadHistory,
  loadPrefs,
  saveAge,
  savePrefs,
  saveSession,
  updateRating,
} from "./storage.ts";
import type { Phase, Prefs, SessionRecord, SessionResult } from "./types.ts";

type Screen =
  | { name: "age" }
  | { name: "underage" }
  | { name: "setup" }
  | { name: "session"; plan: Phase[]; prefs: Prefs }
  | { name: "summary"; record: SessionRecord }
  | { name: "history" };

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => (loadAge() ? { name: "setup" } : { name: "age" }));
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs());

  function changePrefs(next: Prefs) {
    setPrefs(next);
    savePrefs(next);
  }

  function start() {
    unlockAudio();
    unlockVoice(prefs.voice);
    vibrate(prefs.vibrate, 12);
    const plan = buildPlan({
      difficulty: prefs.difficulty,
      durationMin: prefs.durationMin,
      bonus: prefs.bonus,
    });
    setScreen({ name: "session", plan, prefs: { ...prefs } });
  }

  function finish(result: SessionResult) {
    const record: SessionRecord = {
      ...result,
      id: crypto.randomUUID(),
      completedAt: Date.now(),
      rating: null,
    };
    saveSession(record);
    setScreen({ name: "summary", record });
  }

  return (
    <>
      {screen.name === "age" ? (
        <AgeGate
          onEnter={() => {
            saveAge();
            setScreen({ name: "setup" });
          }}
          onUnderage={() => setScreen({ name: "underage" })}
        />
      ) : null}
      {screen.name === "underage" ? <Underage onBack={() => setScreen({ name: "age" })} /> : null}
      {screen.name === "setup" ? (
        <SetupScreen
          prefs={prefs}
          streak={computeStreak(loadHistory())}
          onChange={changePrefs}
          onStart={start}
          onHistory={() => setScreen({ name: "history" })}
        />
      ) : null}
      {screen.name === "session" ? (
        <SessionScreen
          plan={screen.plan}
          difficulty={screen.prefs.difficulty}
          durationMin={screen.prefs.durationMin}
          sound={screen.prefs.sound}
          vibrate={screen.prefs.vibrate}
          voice={screen.prefs.voice}
          onDone={finish}
        />
      ) : null}
      {screen.name === "summary" ? (
        <SummaryScreen
          record={screen.record}
          onRate={(score) => {
            updateRating(screen.record.id, score);
            setScreen({ name: "summary", record: { ...screen.record, rating: score } });
          }}
          onAgain={() => setScreen({ name: "setup" })}
          onHistory={() => setScreen({ name: "history" })}
        />
      ) : null}
      {screen.name === "history" ? (
        <HistoryScreen onBack={() => setScreen({ name: "setup" })} onClear={clearHistory} />
      ) : null}
    </>
  );
}
