"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";
import {
  useChangePassword,
  useSessions,
  useRevokeSession,
  useEnableTwoFactor,
  useConfirmTwoFactor,
  useDisableTwoFactor,
} from "@/lib/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardTitle } from "@/components/ui/card";
import { ErrorText } from "@/components/ui/error-text";
import { Spinner } from "@/components/ui/spinner";
import { Modal } from "@/components/ui/modal";
import { ShieldIcon, CheckCircleIcon } from "@/components/dashboard/icons";

function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function reset() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setDone(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Change password"
    >
      {done ? (
        <div className="text-center">
          <CheckCircleIcon className="mx-auto h-10 w-10 text-emerald-500" />
          <p className="mt-3 text-sm text-slate-700">Your password has been changed.</p>
          <Button
            className="mt-5 w-full"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">At least 10 characters.</p>
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" className="w-full" isLoading={changePassword.isPending}>
            Update password
          </Button>
        </form>
      )}
    </Modal>
  );
}

function EnableTwoFactorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { refreshUser } = useAuth();
  const enable = useEnableTwoFactor();
  const confirm = useConfirmTwoFactor();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const enrollment = enable.data;

  useEffect(() => {
    if (open && !enrollment && !enable.isPending) void enable.mutateAsync().catch(() => {});
    // Only the modal opening should kick off enrollment; `enable` is a
    // useMutation result that gets a fresh identity every render, so
    // including it would re-fire this on every keystroke in the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function reset() {
    setCode("");
    setError(null);
    setRecoveryCodes(null);
    enable.reset();
    confirm.reset();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await confirm.mutateAsync({ code });
      setRecoveryCodes(result.recoveryCodes);
      await refreshUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid code. Please try again.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Enable two-factor authentication"
    >
      {recoveryCodes ? (
        <div>
          <p className="text-sm text-slate-700">
            Save these recovery codes somewhere safe. Each one can be used once to sign in if you lose access to your
            authenticator app.
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 font-mono text-sm text-slate-800">
            {recoveryCodes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <Button
            className="mt-5 w-full"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            I&apos;ve saved these codes
          </Button>
        </div>
      ) : enable.isPending || !enrollment ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <p className="text-sm text-slate-600">Scan this QR code with your authenticator app, then enter the 6-digit code it shows.</p>
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- server-generated data: URI, not an optimizable remote asset */}
            <img src={enrollment.qrCodeDataUrl} alt="Two-factor setup QR code" className="h-44 w-44 rounded-lg border border-slate-200" />
          </div>
          <div>
            <Label htmlFor="twoFactorCode">Verification code</Label>
            <Input
              id="twoFactorCode"
              autoComplete="one-time-code"
              placeholder="123456"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" className="w-full" isLoading={confirm.isPending}>
            Verify and enable
          </Button>
        </form>
      )}
    </Modal>
  );
}

function DisableTwoFactorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { refreshUser } = useAuth();
  const disable = useDisableTwoFactor();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setPassword("");
    setCode("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await disable.mutateAsync({ password, code });
      await refreshUser();
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Disable two-factor authentication"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="disablePassword">Password</Label>
          <Input
            id="disablePassword"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="disableCode">Authenticator code</Label>
          <Input
            id="disableCode"
            autoComplete="one-time-code"
            placeholder="123456 or recovery code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" variant="danger" className="w-full" isLoading={disable.isPending}>
          Disable two-factor authentication
        </Button>
      </form>
    </Modal>
  );
}

function describeSession(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  if (/mobile/i.test(userAgent)) return "Mobile device";
  if (/mac os/i.test(userAgent)) return "Mac";
  if (/windows/i.test(userAgent)) return "Windows PC";
  if (/linux/i.test(userAgent)) return "Linux";
  return "Browser session";
}

function SessionsCard() {
  const { data: sessions, isLoading } = useSessions();
  const revokeSession = useRevokeSession();

  return (
    <Card>
      <CardTitle className="mb-4 text-base font-semibold text-slate-900">Active sessions</CardTitle>
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : !sessions || sessions.length === 0 ? (
        <p className="text-sm text-slate-500">No active sessions.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">
                  {describeSession(s.userAgent)}
                  {s.isCurrent && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">This device</span>}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {s.ipAddress ?? "Unknown IP"} · Last active {new Date(s.lastUsedAt).toLocaleString()}
                </p>
              </div>
              {!s.isCurrent && (
                <button
                  type="button"
                  onClick={() => void revokeSession.mutateAsync(s.id)}
                  disabled={revokeSession.isPending}
                  className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function SecuritySection() {
  const { user } = useAuth();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [enableModalOpen, setEnableModalOpen] = useState(false);
  const [disableModalOpen, setDisableModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Security</h2>
        <p className="text-sm text-slate-500">Manage your password and two-factor authentication.</p>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900">Password</p>
          <p className="text-sm text-slate-500">Change your account password.</p>
        </div>
        <Button variant="secondary" onClick={() => setPasswordModalOpen(true)}>
          Change password
        </Button>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <ShieldIcon className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-sm font-medium text-slate-900">Two-factor authentication</p>
            <p className="text-sm text-slate-500">
              {user?.twoFactorEnabled ? "Enabled — your account has an extra layer of protection." : "Add an authenticator app for extra security."}
            </p>
          </div>
        </div>
        {user?.twoFactorEnabled ? (
          <Button variant="danger" onClick={() => setDisableModalOpen(true)}>
            Disable
          </Button>
        ) : (
          <Button onClick={() => setEnableModalOpen(true)}>Enable</Button>
        )}
      </Card>

      <SessionsCard />

      <ChangePasswordModal open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />
      <EnableTwoFactorModal open={enableModalOpen} onClose={() => setEnableModalOpen(false)} />
      <DisableTwoFactorModal open={disableModalOpen} onClose={() => setDisableModalOpen(false)} />
    </div>
  );
}
