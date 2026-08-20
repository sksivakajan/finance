"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { AuthField } from "@/components/auth/field";
import { AuthIllustration } from "@/components/auth/illustration";
import { EnvelopeIcon, LockIcon, PaperPlaneIcon, ShieldIcon, ChevronLeftIcon } from "@/components/auth/icons";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="text-center">
        <AuthIllustration icon={EnvelopeIcon} />
        <h1 className="mb-2 text-xl font-bold text-white lg:text-slate-900">Check your email</h1>
        <p className="text-sm text-white/60 lg:text-slate-600">
          If an account exists for that address, we&apos;ve sent a reset link.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-300 hover:text-indigo-200 lg:text-indigo-600 lg:hover:text-indigo-500"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <AuthIllustration icon={EnvelopeIcon} badges={[{ icon: LockIcon, className: "bg-fuchsia-500 -bottom-1 right-3" }]} />
      <h1 className="text-center text-2xl font-bold text-white lg:text-slate-900">Forgot your password?</h1>
      <p className="mt-1.5 text-center text-sm text-white/50 lg:text-slate-500">
        No worries! Enter your email and we&apos;ll send you a link to reset it.
      </p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
        <AuthField
          id="email"
          label="Email address"
          icon={EnvelopeIcon}
          type="email"
          autoComplete="email"
          placeholder="Enter your email address"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error && (
          <p className="text-sm text-red-400 lg:text-red-600" role="alert">
            {error}
          </p>
        )}
        <Button
          type="submit"
          isLoading={isSubmitting}
          className="w-full gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-base hover:from-indigo-500 hover:to-purple-500"
        >
          Send reset link
          <PaperPlaneIcon className="h-4 w-4" />
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10 lg:bg-slate-200" />
        <span className="text-xs text-white/40 lg:text-slate-400">or</span>
        <div className="h-px flex-1 bg-white/10 lg:bg-slate-200" />
      </div>

      <Link
        href="/login"
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 lg:border-slate-200 lg:bg-white lg:text-slate-700 lg:hover:bg-slate-50"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Back to log in
      </Link>

      <div className="mt-7 flex items-center justify-center gap-2 text-xs text-white/40 lg:text-slate-500">
        <ShieldIcon className="h-4 w-4 text-indigo-300 lg:text-indigo-500" />
        <span>Your data is safe with us</span>
      </div>
    </div>
  );
}
