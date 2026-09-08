import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

const TONE_STYLES = {
  violet: { bg: "bg-violet-100", text: "text-violet-700", spark: "#8b5cf6" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-700", spark: "#10b981" },
  amber: { bg: "bg-amber-100", text: "text-amber-700", spark: "#f59e0b" },
  sky: { bg: "bg-sky-100", text: "text-sky-700", spark: "#0ea5e9" },
} as const;

// Purely decorative -- not plotted from real data, just an accent matching
// the reference design's per-card squiggle.
function Sparkline({ color }: { color: string }) {
  return (
    <svg width="64" height="28" viewBox="0 0 64 28" fill="none" aria-hidden="true" className="shrink-0">
      <path
        d="M1 22 C 10 20, 14 8, 22 12 S 34 24, 42 14 S 54 2, 63 6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ExpenseStatCard({
  label,
  value,
  sublabel,
  icon,
  tone = "violet",
}: {
  label: string;
  value: string;
  sublabel: string;
  icon: React.ReactNode;
  tone?: keyof typeof TONE_STYLES;
}) {
  const toneStyle = TONE_STYLES[tone];
  return (
    <Card>
      <div className="flex items-center gap-2.5">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", toneStyle.bg, toneStyle.text)}>
          {icon}
        </span>
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <p className="mt-3 truncate text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">{value}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">{sublabel}</p>
        <Sparkline color={toneStyle.spark} />
      </div>
    </Card>
  );
}
