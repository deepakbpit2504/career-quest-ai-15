type ScoreRingProps = { value: number | null; label: string; tone?: "brand" | "accent" | "violet" };

export function ScoreRing({ value, label, tone = "brand" }: ScoreRingProps) {
  const color = tone === "accent" ? "var(--ai-accent)" : tone === "violet" ? "var(--brand-strong)" : "var(--brand)";
  const score = value ?? 0;
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-canvas p-3">
      <div className="relative grid size-20 place-items-center">
        <svg viewBox="0 0 36 36" className="size-20 -rotate-90" aria-label={`${label}: ${value ?? "not available"}`}>
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--border)" strokeWidth="3.5" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${score} 100`} className="transition-all duration-700" />
        </svg>
        <span className="absolute font-display text-lg font-bold text-foreground">{value ?? "—"}</span>
      </div>
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}