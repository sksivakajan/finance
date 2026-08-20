"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { LoginInput } from "@finance/shared";
import { api, ApiError, refreshAccessToken } from "./api-client";
import { setAccessToken } from "./token-store";
import type { PublicUser } from "./types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

// Auto-logout after this long with no interaction anywhere in the app --
// a finance app left open and untouched shouldn't stay signed in
// indefinitely. Resets on any of the activity events below.
const IDLE_LOGOUT_MS = 60_000;
const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "wheel", "touchstart", "scroll"] as const;

interface AuthContextValue {
  user: PublicUser | null;
  status: AuthStatus;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const refreshUser = useCallback(async () => {
    try {
      const me = await api.get<PublicUser>("/users/me");
      setUser(me);
      setStatus("authenticated");
    } catch {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    // On first load there's no access token in memory yet — try the httpOnly
    // refresh cookie to silently resume a session (standard SPA pattern).
    let cancelled = false;
    (async () => {
      const ok = await refreshAccessToken();
      if (cancelled) return;
      if (ok) {
        await refreshUser();
      } else {
        setStatus("unauthenticated");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (input: LoginInput) => {
      const { accessToken } = await api.post<{ accessToken: string }>("/auth/login", input);
      setAccessToken(accessToken);
      await refreshUser();
    },
    [refreshUser],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setAccessToken(null);
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;

    let timeoutId: ReturnType<typeof setTimeout>;
    const resetIdleTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => void logout(), IDLE_LOGOUT_MS);
    };

    resetIdleTimer();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetIdleTimer, { passive: true });
    }

    return () => {
      clearTimeout(timeoutId);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetIdleTimer);
      }
    };
  }, [status, logout]);

  return (
    <AuthContext.Provider value={{ user, status, login, logout, refreshUser }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { ApiError };
