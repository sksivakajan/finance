"use client";

import { useMemo, useRef, useState } from "react";
import type { MonthlySeriesPoint } from "@/lib/types";
import { formatMoney } from "@/lib/money";

const WIDTH = 600;
const HEIGHT = 220;
const PAD_X = 8;
const PAD_TOP = 16;
const PAD_BOTTOM = 8;

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, { month: "short" });
}

export function IncomeChart({ points, currency }: { points: MonthlySeriesPoint[]; currency: string }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const values = points.map((p) => Number(p.amountMinor));
  const max = Math.max(...values, 1);

  const coords = useMemo(
    () =>
      points.map((p, i) => {
        const x = points.length > 1 ? PAD_X + (i / (points.length - 1)) * (WIDTH - PAD_X * 2) : WIDTH / 2;
        const y = PAD_TOP + (1 - Number(p.amountMinor) / max) * (HEIGHT - PAD_TOP - PAD_BOTTOM);
        return { x, y };
      }),
    [points, max],
  );

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const areaPath =
    coords.length > 0
      ? `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${HEIGHT - PAD_BOTTOM} L${coords[0].x.toFixed(1)},${HEIGHT - PAD_BOTTOM} Z`
      : "";

  const ticks = [max, max * 0.5, 0];

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const userPoint = point.matrixTransform(ctm.inverse());

    let closest = 0;
    let closestDist = Infinity;
    coords.forEach((c, i) => {
      const dist = Math.abs(c.x - userPoint.x);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });
    setHoverIndex(closest);
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const hoveredCoord = hoverIndex !== null ? coords[hoverIndex] : null;

  return (
    <div className="mt-1 flex gap-2">
      <div className="flex w-16 shrink-0 flex-col justify-between py-4 text-right text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
        {ticks.map((t, i) => (
          <span key={i}>{formatMoney(Math.round(t).toString(), currency)}</span>
        ))}
      </div>
      <div className="relative min-w-0 flex-1">
        <svg
          ref={svgRef}
          data-testid="income-chart"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-52 w-full"
          preserveAspectRatio="none"
          onPointerMove={handleMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="income-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
            </linearGradient>
          </defs>
          {areaPath && <path d={areaPath} fill="url(#income-fill)" />}
          {linePath && (
            <path d={linePath} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          )}
          {coords.map((c, i) => (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r={hoverIndex === i ? 4 : 2.5}
              fill="#7c3aed"
              stroke="white"
              strokeWidth={hoverIndex === i ? 1.5 : 1}
            />
          ))}
          {hoveredCoord && (
            <line
              x1={hoveredCoord.x}
              y1={PAD_TOP}
              x2={hoveredCoord.x}
              y2={HEIGHT - PAD_BOTTOM}
              stroke="#c4b5fd"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          )}
        </svg>
        {hovered && hoveredCoord && (
          <div
            className="pointer-events-none absolute whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
            style={{
              left: `${(hoveredCoord.x / WIDTH) * 100}%`,
              top: `${Math.max(0, (hoveredCoord.y / HEIGHT) * 100 - 25)}%`,
              transform:
                hoveredCoord.x / WIDTH > 0.85
                  ? "translateX(-100%)"
                  : hoveredCoord.x / WIDTH < 0.15
                    ? "translateX(0)"
                    : "translateX(-50%)",
            }}
          >
            <p className="font-medium tabular-nums">{formatMoney(hovered.amountMinor, currency)}</p>
            <p className="text-slate-300">
              {new Date(`${hovered.month}-01`).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </p>
          </div>
        )}
        <div className="mt-1 flex justify-between pl-1 pr-1 text-[10px] text-slate-400 dark:text-slate-500">
          {points.map((p, i) => (
            <span key={p.month} className={i === hoverIndex ? "font-semibold text-violet-600" : ""}>
              {monthLabel(p.month)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
