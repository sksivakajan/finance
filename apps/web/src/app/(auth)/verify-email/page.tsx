"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { Spinner } from "@/components/ui/spinner";
import { AuthIllustration } from "@/components/auth/illustration";
import { CheckIcon, ShieldIcon } from "@/components/auth/icons";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    // No token: nothing to verify, so there's no async work for this effect
    // to do — that's a render-time derivation, not an effect concern.
    if (!token) return;
    api
      .post<{ message: string }>("/auth/verify-email", { token })
      .then((res) => {
        setState("success");
        setMessage(res.message);
      })
      .catch((err) => {
        setState("error");
        setMessage(err instanceof ApiError ? err.message : "Something went wrong.");
      });
  }, [token]);

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="mb-2 text-xl font-bold text-white lg:text-slate-900">Verification failed</h1>
        <p className="text-sm text-white/60 lg:text-slate-600">This link is missing a verification token.</p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-indigo-300 hover:text-indigo-200 lg:text-indigo-600 lg:hover:text-indigo-500"
        >
          Back to log in
        </Link>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <Spinner className="border-white/20 border-t-indigo-400 lg:border-slate-300 lg:border-t-indigo-600" />
        <p className="text-sm text-white/50 lg:text-slate-500">Verifying your email…</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <AuthIllustration icon={state === "success" ? CheckIcon : ShieldIcon} />
      <h1 className="mb-2 text-xl font-bold text-white lg:text-slate-900">
        {state === "success" ? "Email verified" : "Verification failed"}
      </h1>
      <p className="text-sm text-white/60 lg:text-slate-600">{message}</p>
      <Link
        href="/login"
        className="mt-6 inline-block text-sm font-medium text-indigo-300 hover:text-indigo-200 lg:text-indigo-600 lg:hover:text-indigo-500"
      >
        Back to log in
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <VerifyEmailInner />
    </Suspense>
  );
}
