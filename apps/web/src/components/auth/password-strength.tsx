function scoreOf(password: string): number {
  if (password.length === 0) return 0;
  let score = password.length >= 10 ? 1 : 0;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

export function PasswordStrength({ password }: { password: string }) {
  const score = scoreOf(password);
  const colors = ["bg-red-400", "bg-amber-400", "bg-emerald-400"];

  return (
    <div>
      <div className="mt-2 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i < score ? colors[score - 1] : "bg-white/10 lg:bg-slate-200"}`}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-white/40 lg:text-slate-500">At least 10 characters</p>
    </div>
  );
}
