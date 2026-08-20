"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AuthField } from "@/components/auth/field";
import { AuthIllustration } from "@/components/auth/illustration";
import { LockIcon, EyeIcon, EyeOffIcon, CheckIcon } from "@/components/auth/icons";

function ResetPasswordInner() {
  const token = useSearchParams().get("token");
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post("/auth/reset-password", { token, newPassword });
      setDone(true);
      setTimeout(() => router.replace("/login"), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="mb-2 text-xl font-bold text-white lg:text-slate-900">Invalid reset link</h1>
        <p className="text-sm text-white/60 lg:text-slate-600">
          This password reset link is missing or incomplete. Request a new one to continue.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block text-sm font-medium text-indigo-300 hover:text-indigo-200 lg:text-indigo-600 lg:hover:text-indigo-500"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <AuthIllustration icon={CheckIcon} />
        <h1 className="mb-2 text-xl font-bold text-white lg:text-slate-900">Password reset</h1>
        <p className="text-sm text-white/60 lg:text-slate-600">Redirecting you to log in…</p>
      </div>
    );
  }

  return (
    <div>
      <AuthIllustration icon={LockIcon} />
      <h1 className="mb-6 text-center text-xl font-bold text-white lg:text-slate-900">Choose a new password</h1>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <AuthField
            id="newPassword"
            label="New password"
            icon={LockIcon}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Create a strong password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="text-white/40 hover:text-white/70 lg:text-slate-400 lg:hover:text-slate-600"
              >
                {showPassword ? <EyeOffIcon className="h-4.5 w-4.5" /> : <EyeIcon className="h-4.5 w-4.5" />}
              </button>
            }
          />
          <p className="mt-1.5 text-xs text-white/40 lg:text-slate-500">At least 10 characters.</p>
        </div>
        {error && (
          <p className="text-sm text-red-400 lg:text-red-600" role="alert">
            {error}
          </p>
        )}
        <Button
          type="submit"
          isLoading={isSubmitting}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-base hover:from-indigo-500 hover:to-purple-500"
        >
          Reset password
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-white/50 lg:text-slate-500">
        <Link href="/login" className="font-medium text-indigo-300 hover:text-indigo-200 lg:text-indigo-600 lg:hover:text-indigo-500">
          Back to log in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ResetPasswordInner />
    </Suspense>
  );
}
