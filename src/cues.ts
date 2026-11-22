let audioContext: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioContext) audioContext = new Ctx();
  return audioContext;
}

export function unlockAudio() {
  const ctx = context();
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

export class Metronome {
  onBeat: (index: number) => void = () => {};
  private bpm: number | null = null;
  private sound = false;
  private running = false;
  private beatIndex = 0;
  private last = 0;
  private timer = 0;

  setSound(on: boolean) {
    this.sound = on;
  }

  setBpm(bpm: number | null) {
    if (this.bpm === bpm) return;
    this.bpm = bpm;
    this.align();
  }

  align() {
    this.beatIndex = 0;
    this.last = performance.now();
  }

  start() {
    if (this.running) return;
    this.running = true;
    if (this.last === 0) this.last = performance.now();
    const loop = () => {
      if (!this.running) return;
      if (this.bpm) {
        const interval = 60_000 / this.bpm;
        const now = performance.now();
        if (now - this.last >= interval) {
          this.last += interval;
          if (now - this.last > interval) this.last = now;
          this.fire();
        }
      }
      this.timer = window.setTimeout(loop, 25);
    };
    loop();
  }

  stop() {
    this.running = false;
    window.clearTimeout(this.timer);
  }

  private fire() {
    const index = this.beatIndex;
    this.beatIndex += 1;
    if (this.sound) this.click(index % 4 === 0);
    this.onBeat(index);
  }

  private click(accent: boolean) {
    const ctx = context();
    if (!ctx) return;
    const time = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(accent ? 720 : 510, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.04 : 0.026, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.05);
  }
}

function chineseVoice(): SpeechSynthesisVoice | undefined {
  if (typeof window === "undefined" || !window.speechSynthesis) return undefined;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.lang === "zh-CN") ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("zh"))
  );
}

export function unlockVoice(enabled: boolean) {
  if (!enabled || typeof window === "undefined" || !window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance("开始");
  utterance.lang = "zh-CN";
  utterance.volume = 0.01;
  utterance.rate = 1;
  const voice = chineseVoice();
  if (voice) utterance.voice = voice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function speak(enabled: boolean, text: string) {
  if (!enabled || typeof window === "undefined" || !window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = 1.02;
  utterance.pitch = 1;
  const voice = chineseVoice();
  if (voice) utterance.voice = voice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function silence() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

export function vibrate(enabled: boolean, pattern: number | number[]) {
  if (!enabled || typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* some browsers expose the method and still reject it */
  }
}

let wakeLock: WakeLockSentinel | null = null;

export async function keepAwake() {
  try {
    if (!("wakeLock" in navigator)) return;
    wakeLock = await navigator.wakeLock.request("screen");
  } catch {
    wakeLock = null;
  }
}

export async function allowSleep() {
  try {
    await wakeLock?.release();
  } catch {
    /* already released */
  }
  wakeLock = null;
}
