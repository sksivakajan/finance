"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, ApiError } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorText } from "@/components/ui/error-text";
import {
  UserIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  ChartIcon,
  UsersIcon,
  ChatIcon,
  DollarIcon,
  TrendUpIcon,
  ShieldIcon,
  GlobeIcon,
  ChevronDownIcon,
  GoogleLogo,
  AppleLogo,
  FacebookLogo,
} from "./icons";

const REMEMBERED_EMAIL_KEY = "finance:rememberedEmail";

const FEATURES = [
  {
    icon: ChartIcon,
    iconBg: "bg-indigo-500",
    title: "Track Finances",
    description: "Income, expenses, loans and more.",
  },
  {
    icon: UsersIcon,
    iconBg: "bg-teal-500",
    title: "Split & Settle",
    description: "Split bills, track balances, and settle easily.",
  },
  {
    icon: ChatIcon,
    iconBg: "bg-amber-500",
    title: "Chat & Connect",
    description: "Chat with friends and manage money together.",
  },
];

function BalanceIllustration() {
  return (
    <div className="relative mx-auto mt-8 h-56 w-full max-w-xs">
      <div className="absolute -left-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-400 text-white shadow-lg shadow-emerald-900/30">
        <TrendUpIcon className="h-5 w-5" />
      </div>
      <div className="absolute right-0 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 text-white shadow-lg shadow-amber-900/30">
        <DollarIcon className="h-5 w-5" />
      </div>
      <div className="absolute -right-3 bottom-6 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-fuchsia-400 text-white shadow-lg shadow-fuchsia-900/30">
        <UserIcon className="h-5 w-5" />
      </div>

      <div className="absolute inset-x-6 top-8 rotate-2 rounded-2xl border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur-sm">
        <p className="text-[11px] font-medium uppercase tracking-wide text-white/60">Total Balance</p>
        <p className="mt-1 text-2xl font-bold text-white">$ 12,560.00</p>
        <svg viewBox="0 0 120 32" className="mt-2 h-8 w-full text-emerald-300">
          <polyline
            points="0,26 15,20 30,24 45,12 60,16 75,6 90,10 105,2 120,8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-xs">
          <div>
            <p className="text-white/50">Income</p>
            <p className="font-semibold text-emerald-300">$ 8,450.00</p>
          </div>
          <div className="text-right">
            <p className="text-white/50">Expenses</p>
            <p className="font-semibold text-rose-300">$ 4,320.00</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [socialNotice, setSocialNotice] = useState<string | null>(null);

  useEffect(() => {
    // Deliberately an effect, not a lazy useState initializer: localStorage
    // isn't available during server render, so seeding state here (after
    // hydration) avoids a server/client hydration mismatch on these two
    // controlled inputs.
    const remembered = window.localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (remembered) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEmail(remembered);
      setRememberMe(true);
    }
  }, []);

  async function handleResend() {
    setResendStatus("sending");
    try {
      await api.post("/auth/resend-verification", { email });
    } finally {
      setResendStatus("sent");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setIsSubmitting(true);
    try {
      await login({ email, password, twoFactorCode: twoFactorCode || undefined });
      if (rememberMe) {
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      } else {
        window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "TWO_FACTOR_REQUIRED") {
          setNeedsTwoFactor(true);
          setError(null);
        } else if (err.code === "EMAIL_NOT_VERIFIED") {
          setNeedsVerification(true);
        } else {
          setError(err.message);
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-[#eef0fc] p-0 lg:items-center lg:justify-center lg:p-6">
      <div className="flex min-h-screen w-full max-w-6xl overflow-hidden bg-white lg:min-h-0 lg:rounded-[2rem] lg:shadow-2xl">
        {/* Left showcase panel */}
        <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-900 p-10 text-white lg:flex xl:p-12">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-lg font-bold text-indigo-700 shadow-lg">
                F
              </span>
              <div>
                <p className="text-lg font-semibold">FinConnect</p>
                <p className="text-xs text-white/60">Manage. Share. Grow.</p>
              </div>
            </div>

            <h1 className="mt-10 text-4xl font-bold leading-tight xl:text-[2.75rem]">
              Your finance,
              <br />
              <span className="bg-gradient-to-r from-indigo-300 to-fuchsia-300 bg-clip-text text-transparent">
                connected.
              </span>
            </h1>
            <p className="mt-4 max-w-sm text-sm text-white/70">
              Track your income and expenses, manage loans, split bills, and stay connected with friends.
            </p>

            <ul className="mt-8 space-y-4">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex items-start gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${f.iconBg} text-white`}>
                    <f.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{f.title}</p>
                    <p className="text-xs text-white/60">{f.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <BalanceIllustration />

          <div className="flex items-center gap-2 text-xs text-white/50">
            <ShieldIcon className="h-4 w-4" />
            Your data is encrypted and always private.
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex w-full flex-col justify-center px-6 py-10 sm:px-10 md:px-14 lg:w-1/2 lg:px-16">
          <div className="mb-8 flex items-center justify-between lg:justify-end">
            <div className="flex items-center gap-2 lg:hidden">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
                F
              </span>
              <span className="text-sm font-semibold text-slate-900">FinConnect</span>
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <GlobeIcon className="h-3.5 w-3.5" />
              English
              <ChevronDownIcon className="h-3.5 w-3.5" />
            </button>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Welcome back</h2>
          <p className="mt-1.5 text-sm text-slate-500">Login to continue to your account</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <LockIcon className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOffIcon className="h-4.5 w-4.5" /> : <EyeIcon className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {needsTwoFactor && (
              <div>
                <Label htmlFor="code">Two-factor code</Label>
                <Input
                  id="code"
                  autoComplete="one-time-code"
                  placeholder="6-digit code or recovery code"
                  required
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                />
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Remember me
              </label>
              <Link href="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                Forgot password?
              </Link>
            </div>

            {needsVerification && (
              <p className="text-sm text-amber-700">
                Please verify your email before logging in.{" "}
                {resendStatus === "sent" ? (
                  "New link sent — check your inbox."
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendStatus === "sending"}
                    className="font-medium underline disabled:opacity-60"
                  >
                    Resend verification email
                  </button>
                )}
              </p>
            )}
            <ErrorText>{error}</ErrorText>

            <Button
              type="submit"
              isLoading={isSubmitting}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-base hover:from-indigo-500 hover:to-purple-500"
            >
              Login
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">or continue with</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Google", icon: GoogleLogo },
              { label: "Apple", icon: AppleLogo },
              { label: "Facebook", icon: FacebookLogo },
            ].map((provider) => (
              <button
                key={provider.label}
                type="button"
                onClick={() => setSocialNotice(`Signing in with ${provider.label} isn't available yet.`)}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <provider.icon className="text-slate-900" />
                <span className="hidden sm:inline">{provider.label}</span>
              </button>
            ))}
          </div>
          {socialNotice && <p className="mt-3 text-center text-xs text-slate-500">{socialNotice}</p>}

          <p className="mt-8 text-center text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
