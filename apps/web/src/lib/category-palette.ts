// A small fixed, stable palette assigned to categories by hashing their id --
// so "Salary" (say) always renders the same color everywhere on the page
// (donut segment, legend dot, table chip) regardless of which order the
// category happens to appear in a given list.
const PALETTE = [
  { dot: "bg-violet-500", chip: "bg-violet-100 text-violet-700", hex: "#7c3aed" },
  { dot: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-700", hex: "#10b981" },
  { dot: "bg-amber-500", chip: "bg-amber-100 text-amber-700", hex: "#f59e0b" },
  { dot: "bg-sky-500", chip: "bg-sky-100 text-sky-700", hex: "#0ea5e9" },
  { dot: "bg-rose-500", chip: "bg-rose-100 text-rose-700", hex: "#f43f5e" },
  { dot: "bg-teal-500", chip: "bg-teal-100 text-teal-700", hex: "#14b8a6" },
] as const;

export type PaletteColor = (typeof PALETTE)[number];

export function paletteForKey(key: string): PaletteColor {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
