"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { Spinner } from "@/components/ui/spinner";

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
        <h1 className="mb-2 text-xl font-semibold text-slate-900">Verification failed</h1>
        <p className="text-sm text-slate-600">This link is missing a verification token.</p>
        <Link href="/login" className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500">
          Back to log in
        </Link>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <Spinner />
        <p className="text-sm text-slate-500">Verifying your email…</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <h1 className="mb-2 text-xl font-semibold text-slate-900">
        {state === "success" ? "Email verified" : "Verification failed"}
      </h1>
      <p className="text-sm text-slate-600">{message}</p>
      <Link href="/login" className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500">
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
