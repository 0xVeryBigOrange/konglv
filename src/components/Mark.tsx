export function Mark({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="11" fill="none" stroke="#e6b15a" strokeWidth="1.7" />
      <circle cx="16" cy="16" r="2.5" fill="#8fd0c4" />
    </svg>
  );
}
