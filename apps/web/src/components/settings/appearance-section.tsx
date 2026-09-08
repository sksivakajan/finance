"use client";

import { useTheme, type Theme } from "@/lib/theme-context";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";
import { SunIcon, MoonIcon, MonitorIcon } from "@/components/dashboard/icons";

const OPTIONS: { value: Theme; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
];

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Appearance</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Customize how Finance looks.</p>
      </div>

      <Card>
        <p className="mb-3 text-sm font-medium text-slate-900 dark:text-slate-100">Theme</p>
        <div className="grid grid-cols-3 gap-2">
          {OPTIONS.map((option) => {
            const active = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                aria-pressed={active}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border px-3 py-4 text-sm font-medium transition-colors",
                  active
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-300"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/50",
                )}
              >
                <option.icon className="h-5 w-5" />
                {option.label}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          &quot;System&quot; follows your device&apos;s light/dark setting automatically.
        </p>
      </Card>
    </div>
  );
}
