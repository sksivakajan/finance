"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError, api } from "@/lib/api-client";
import { useDeactivateAccount } from "@/lib/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ErrorText } from "@/components/ui/error-text";
import { Modal } from "@/components/ui/modal";

function DeactivateAccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { logout } = useAuth();
  const deactivate = useDeactivateAccount();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await deactivate.mutateAsync({ password });
      await logout();
      router.replace("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        setPassword("");
        setError(null);
        onClose();
      }}
      title="Deactivate account"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <p className="text-sm text-slate-600">
          This deactivates your account and signs you out everywhere. Confirm with your password to continue.
        </p>
        <div>
          <Label htmlFor="deactivatePassword">Password</Label>
          <Input
            id="deactivatePassword"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" variant="danger" className="w-full" isLoading={deactivate.isPending}>
          Deactivate my account
        </Button>
      </form>
    </Modal>
  );
}

export function DataStorageSection() {
  const [modalOpen, setModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleExport() {
    setExportError(null);
    setIsExporting(true);
    try {
      const data = await api.get<Record<string, unknown>>("/users/me/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `finance-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof ApiError ? err.message : "Couldn't export your data.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Data &amp; Storage</h2>
        <p className="text-sm text-slate-500">Export your data or manage your account.</p>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900">Export your data</p>
          <p className="text-sm text-slate-500">Download your income, expenses, loans, and scheduled payments as JSON.</p>
        </div>
        <Button variant="secondary" onClick={() => void handleExport()} isLoading={isExporting}>
          {isExporting ? "Preparing…" : "Export data"}
        </Button>
      </Card>
      <ErrorText>{exportError}</ErrorText>

      <Card className="border-rose-200 bg-rose-50/40">
        <p className="text-sm font-medium text-rose-900">Danger zone</p>
        <p className="mt-1 text-sm text-rose-700">Deactivating your account signs you out everywhere and disables sign-in.</p>
        <Button variant="danger" className="mt-3" onClick={() => setModalOpen(true)}>
          Deactivate account
        </Button>
      </Card>

      <DeactivateAccountModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
