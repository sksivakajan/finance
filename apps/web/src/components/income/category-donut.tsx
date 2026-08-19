import type { CategoryBreakdownEntry } from "@/lib/types";
import { formatMoney } from "@/lib/money";
import { paletteForKey } from "@/lib/category-palette";
import { EmptyState } from "@/components/ui/empty-state";

const SIZE = 200;
const RADIUS = 72;
const STROKE = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CategoryDonut({ entries, currency }: { entries: CategoryBreakdownEntry[]; currency: string }) {
  if (entries.length === 0) {
    return <EmptyState title="No income yet" description="Categorized income this year will show up here." />;
  }

  const total = entries.reduce((sum, e) => sum + Number(e.amountMinor), 0) || 1;
  // Prefix-sum each segment's starting offset up front, rather than
  // mutating a running total while mapping over JSX (not safe under React
  // Compiler's purity checks).
  const segments = entries.reduce<{ entry: CategoryBreakdownEntry; length: number; offset: number }[]>((acc, entry) => {
    const fraction = Number(entry.amountMinor) / total;
    const length = fraction * CIRCUMFERENCE;
    const priorTotal = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].length : 0;
    acc.push({ entry, length, offset: priorTotal });
    return acc;
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE}>
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#f1f5f9" strokeWidth={STROKE} />
            {segments.map(({ entry, length, offset }) => (
              <circle
                key={entry.categoryId}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={paletteForKey(entry.categoryId).hex}
                strokeWidth={STROKE}
                strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                strokeDashoffset={-offset}
                strokeLinecap={entries.length > 1 ? "butt" : "round"}
              />
            ))}
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-xs text-slate-500">{currency}</p>
          <p className="text-lg font-semibold tabular-nums text-slate-900">{(total / 100).toLocaleString()}</p>
          <p className="text-xs text-slate-500">Total</p>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-3">
        {entries.slice(0, 6).map((entry) => {
          const pct = Math.round((Number(entry.amountMinor) / total) * 100);
          return (
            <li key={entry.categoryId} className="text-sm">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${paletteForKey(entry.categoryId).dot}`} />
                <span className="min-w-0 truncate font-medium text-slate-900">{entry.name}</span>
              </div>
              <div className="ml-[18px] flex items-center gap-1.5 text-xs text-slate-500">
                <span>{pct}%</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{formatMoney(entry.amountMinor, currency)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
