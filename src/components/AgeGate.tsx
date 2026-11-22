import { Mark } from "./Mark.tsx";

type AgeGateProps = {
  onEnter: () => void;
  onUnderage: () => void;
};

export function AgeGate({ onEnter, onUnderage }: AgeGateProps) {
  return (
    <main className="shell flex min-h-dvh flex-col px-6 pt-safe pb-safe">
      <div className="rise">
        <Mark />
        <p className="mt-6 text-xs tracking-[0.22em] text-brass">18+</p>
        <h1 className="mt-3 text-[2rem] leading-tight font-medium text-cream">
          开始前，确认你已年满 18 岁
        </h1>
      </div>
      <div className="rise mt-8 space-y-4 text-[15px] leading-7 text-muted" style={{ animationDelay: "70ms" }}>
        <p>
          控律是面向成年人的节奏自训。它用停-动法、守住边缘的节奏，以及盆底肌的收紧和放松，练习在加速、保持和停下之间稳住自己。
        </p>
        <p>
          这不是医疗建议，也不能代替诊断或治疗，不保证任何效果。感到疼痛或不适，请立刻停止。如有相关健康问题，请咨询专业人士。
        </p>
      </div>
      <div className="mt-auto flex flex-col gap-3 pt-10">
        <button type="button" className="btn btn-primary" data-testid="age-enter" onClick={onEnter}>
          我已满 18 岁，进入
        </button>
        <button type="button" className="btn btn-ghost" data-testid="age-leave" onClick={onUnderage}>
          我未满 18 岁
        </button>
        <p className="pt-2 text-center text-xs leading-5 text-faint">记录只保存在这台设备上。</p>
      </div>
    </main>
  );
}

export function Underage({ onBack }: { onBack: () => void }) {
  return (
    <main className="shell flex min-h-dvh flex-col px-6 pt-safe pb-safe">
      <p className="text-xs tracking-[0.22em] text-brass">18+</p>
      <h1 className="mt-3 text-[2rem] leading-tight font-medium text-cream">这次先不进入</h1>
      <p className="mt-6 text-[15px] leading-7 text-muted">
        控律只开放给年满 18 岁的人。感谢你如实确认，现在可以关闭这个页面。
      </p>
      <div className="mt-auto">
        <button type="button" className="btn btn-ghost w-full" data-testid="underage-back" onClick={onBack}>
          返回
        </button>
      </div>
    </main>
  );
}
