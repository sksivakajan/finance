import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400",
          "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500",
          "focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30",
          "disabled:bg-slate-50 disabled:text-slate-400 dark:disabled:bg-slate-800",
          "aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:ring-red-500/30",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
