import { useEffect, useRef } from "react";

type SheetProps = {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  confirmTestId: string;
  cancelTestId: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function Sheet({
  title,
  body,
  confirmLabel,
  cancelLabel,
  danger = false,
  confirmTestId,
  cancelTestId,
  onConfirm,
  onCancel,
}: SheetProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    cancelRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancelRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 px-4 pb-safe sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheet-title"
    >
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-panel p-5 shadow-2xl">
        <h2 id="sheet-title" className="text-xl text-cream">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            ref={cancelRef}
            type="button"
            className="btn btn-ghost"
            data-testid={cancelTestId}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? "btn btn-panic" : "btn btn-primary"}
            data-testid={confirmTestId}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
