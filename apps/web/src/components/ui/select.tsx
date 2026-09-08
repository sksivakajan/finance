import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900",
          "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
          "focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30",
          "disabled:bg-slate-50 disabled:text-slate-400 dark:disabled:bg-slate-800",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);
Select.displayName = "Select";
