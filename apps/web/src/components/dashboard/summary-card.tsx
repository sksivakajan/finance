import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

const TONE_STYLES = {
  violet: { bg: "bg-violet-100", text: "text-violet-700" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-700" },
  rose: { bg: "bg-rose-100", text: "text-rose-700" },
  sky: { bg: "bg-sky-100", text: "text-sky-700" },
} as const;

export function SummaryCard({
  label,
  value,
  icon,
  tone = "violet",
  trend,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: keyof typeof TONE_STYLES;
  /** `direction` is which way the value actually moved (drives the arrow);
   * `sentiment` is whether that's good or bad news for the user (drives the
   * color) -- the two are independent, since e.g. expenses going down is a
   * downward arrow but favorable, not unfavorable. */
  trend?: { direction: "up" | "down"; sentiment: "positive" | "negative"; label: string } | null;
}) {
  const toneStyle = TONE_STYLES[tone];
  return (
    <Card>
      <div className="flex items-center gap-2.5">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", toneStyle.bg, toneStyle.text)}>
          {icon}
        </span>
        <span className="text-sm font-medium text-slate-500">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
      {trend && (
        <p
          className={cn(
            "mt-1 flex items-center gap-1 text-xs font-medium",
            trend.sentiment === "positive" ? "text-emerald-600" : "text-rose-600",
          )}
        >
          <span aria-hidden="true">{trend.direction === "up" ? "↑" : "↓"}</span>
          {trend.label}
        </p>
      )}
    </Card>
  );
}
