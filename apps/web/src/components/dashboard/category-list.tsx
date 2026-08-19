import type { CategoryBreakdownEntry } from "@/lib/types";
import { formatMoney } from "@/lib/money";
import { categoryEmoji } from "@/lib/category-icon";
import { EmptyState } from "@/components/ui/empty-state";

const BAR_COLORS = ["bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-sky-500"];

export function CategoryList({ entries, currency }: { entries: CategoryBreakdownEntry[]; currency: string }) {
  if (entries.length === 0) {
    return <EmptyState title="No expenses yet" description="Categorized spending this month will show up here." />;
  }

  const top = entries.slice(0, 5);
  const total = entries.reduce((sum, e) => sum + Number(e.amountMinor), 0) || 1;

  return (
    <ul className="space-y-3.5">
      {top.map((entry, i) => {
        const pct = (Number(entry.amountMinor) / total) * 100;
        return (
          <li key={entry.categoryId}>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium text-slate-900">
                <span aria-hidden="true">{categoryEmoji(entry.icon)}</span>
                {entry.name}
              </span>
              <span className="tabular-nums text-slate-900">{formatMoney(entry.amountMinor, currency)}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-xs text-slate-400">{pct.toFixed(1)}%</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
