// Category.icon stores a slug (see apps/api's default-categories.ts), not a
// glyph -- this maps the known slugs to an emoji for display. Falls back to a
// generic tag for anything unrecognized (custom user-created categories).
const ICON_MAP: Record<string, string> = {
  utensils: "🍔",
  car: "🚗",
  home: "🏠",
  bolt: "⚡",
  bag: "🛍️",
  film: "🎬",
  "heart-pulse": "❤️",
  "graduation-cap": "🎓",
  shield: "🛡️",
  ellipsis: "➕",
  wallet: "💰",
  laptop: "💻",
  briefcase: "💼",
  percent: "📈",
  landmark: "🏦",
};

export function categoryEmoji(icon: string | null): string {
  if (!icon) return "🏷️";
  return ICON_MAP[icon] ?? "🏷️";
}
