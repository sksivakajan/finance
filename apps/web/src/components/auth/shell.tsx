// Shared card frame for every auth screen (login, register, forgot/reset
// password, verify email) — a dark card on mobile, and a plain light card
// once there's room for it at the lg breakpoint.

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#07061a] px-4 py-10 sm:py-14 lg:bg-[#eef0fc] lg:py-12">
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-indigo-600/30 blur-[100px] lg:hidden"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-24 h-72 w-72 rounded-full bg-fuchsia-600/20 blur-[110px] lg:hidden"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-purple-700/20 blur-[100px] lg:hidden"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-sm">
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8 lg:rounded-2xl lg:border-slate-200 lg:bg-white lg:p-8 lg:shadow-sm lg:backdrop-blur-none">
          {children}
        </div>
      </div>
    </div>
  );
}
