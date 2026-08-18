import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export function SummaryCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <Card>
      <CardTitle>{label}</CardTitle>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums",
          tone === "positive" && "text-emerald-700",
          tone === "negative" && "text-red-700",
          tone === "neutral" && "text-slate-900",
        )}
      >
        {value}
      </p>
    </Card>
  );
}
