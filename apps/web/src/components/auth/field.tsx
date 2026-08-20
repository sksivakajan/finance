import { cn } from "@/lib/cn";

interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  error?: string;
  rightSlot?: React.ReactNode;
}

export function AuthField({ label, icon: Icon, error, rightSlot, id, className, ...props }: AuthFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-white/80 lg:text-slate-700">
        {label}
      </label>
      <div className="flex items-stretch gap-2">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-indigo-300 lg:border-slate-200 lg:bg-slate-50 lg:text-indigo-600">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div className="relative flex-1">
          <input
            id={id}
            aria-invalid={!!error}
            className={cn(
              "block h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 text-sm text-white placeholder:text-white/35",
              "lg:border-slate-300 lg:bg-white lg:text-slate-900 lg:placeholder:text-slate-400",
              "focus:border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30",
              "aria-[invalid=true]:border-red-400/60 aria-[invalid=true]:focus:ring-red-500/30",
              rightSlot && "pr-10",
              className,
            )}
            {...props}
          />
          {rightSlot && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>}
        </div>
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-400 lg:text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
