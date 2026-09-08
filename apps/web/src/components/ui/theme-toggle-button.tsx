"use client";

import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/cn";
import { SunIcon, MoonIcon } from "@/components/dashboard/icons";

export function ThemeToggleButton({ tone = "light", className }: { tone?: "dark" | "light"; className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
        tone === "light"
          ? "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          : "text-white/70 hover:bg-white/10 hover:text-white",
        className,
      )}
    >
      {isDark ? <SunIcon className="h-4.5 w-4.5" /> : <MoonIcon className="h-4.5 w-4.5" />}
    </button>
  );
}
