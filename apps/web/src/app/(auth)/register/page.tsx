"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { registerSchema } from "@finance/shared";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { AuthField } from "@/components/auth/field";
import { AuthIllustration } from "@/components/auth/illustration";
import { PasswordStrength } from "@/components/auth/password-strength";
import {
  UserIcon,
  AtIcon,
  EnvelopeIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  WalletIcon,
  DollarIcon,
  TrendUpIcon,
  ArrowRightIcon,
} from "@/components/auth/icons";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = registerSchema.safeParse({ email, username, displayName, password });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errors[String(issue.path[0])] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/auth/register", parsed.data);
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "VALIDATION_ERROR" && err.issues) {
          const errors: Record<string, string> = {};
          for (const issue of err.issues) errors[issue.path] = issue.message;
          setFieldErrors(errors);
        } else {
          setFormError(err.message);
        }
      } else {
        setFormError("Something went wrong. Please try again.");
      }
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
          We&apos;ve sent a verification link to{" "}
          <span className="font-medium text-white/80 lg:text-slate-800">{email}</span>. Click it to activate your
          account, then log in.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-indigo-300 hover:text-indigo-200 lg:text-indigo-600 lg:hover:text-indigo-500"
        >
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <AuthIllustration
        icon={WalletIcon}
        badges={[
          { icon: TrendUpIcon, className: "bg-emerald-500 -left-2 top-2" },
          { icon: DollarIcon, className: "bg-amber-500 -right-2 bottom-4" },
        ]}
      />
      <h1 className="text-center text-2xl font-bold text-white lg:text-slate-900">Create your account</h1>
      <p className="mt-1.5 text-center text-sm text-white/50 lg:text-slate-500">Start managing your finances smarter.</p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
        <AuthField
          id="displayName"
          label="Display name"
          icon={UserIcon}
          placeholder="Enter your display name"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          error={fieldErrors.displayName}
        />
        <AuthField
          id="username"
          label="Username"
          icon={AtIcon}
          placeholder="Choose a username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={fieldErrors.username}
        />
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
          error={fieldErrors.email}
        />
        <div>
          <AuthField
            id="password"
            label="Password"
            icon={LockIcon}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Create a strong password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
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
          <PasswordStrength password={password} />
        </div>

        {formError && (
          <p className="text-sm text-red-400 lg:text-red-600" role="alert">
            {formError}
          </p>
        )}

        <Button
          type="submit"
          isLoading={isSubmitting}
          className="w-full gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-base hover:from-indigo-500 hover:to-purple-500"
        >
          Create account
          <ArrowRightIcon className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-white/50 lg:text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-indigo-300 hover:text-indigo-200 lg:text-indigo-600 lg:hover:text-indigo-500">
          Log in
        </Link>
      </p>
    </div>
  );
}
