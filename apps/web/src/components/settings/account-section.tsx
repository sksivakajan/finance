"use client";

import { useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiError, api, toAbsoluteApiUrl } from "@/lib/api-client";
import { useUpdateProfile } from "@/lib/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardTitle } from "@/components/ui/card";
import { ErrorText } from "@/components/ui/error-text";
import { Spinner } from "@/components/ui/spinner";
import { Avatar } from "@/components/ui/avatar";
import { CameraIcon } from "@/components/dashboard/icons";

const CURRENCIES = ["LKR", "USD", "EUR", "GBP", "INR", "AUD", "CAD", "JPY", "SGD", "AED"];

export function AccountSection() {
  const { user, refreshUser } = useAuth();
  const updateProfile = useUpdateProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayName = user?.profile?.displayName ?? user?.usernameDisplay ?? "";
  const [name, setName] = useState(displayName);
  const [currency, setCurrency] = useState(user?.profile?.defaultCurrency ?? "LKR");
  const [timezone, setTimezone] = useState(user?.profile?.timezone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    setIsUploadingAvatar(true);
    try {
      const { url } = await api.uploadFile(file);
      await updateProfile.mutateAsync({ avatarUrl: toAbsoluteApiUrl(url) });
      await refreshUser();
    } catch (err) {
      setAvatarError(err instanceof ApiError ? err.message : "Couldn't upload that photo.");
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      await updateProfile.mutateAsync({
        displayName: name.trim(),
        defaultCurrency: currency,
        timezone: timezone.trim() || undefined,
      });
      await refreshUser();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Account Information</h2>
        <p className="text-sm text-slate-500">Update your account details and profile information.</p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Avatar name={displayName} src={user?.profile?.avatarUrl} size="lg" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              aria-label="Change photo"
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {isUploadingAvatar ? <Spinner className="h-3.5 w-3.5 border-white/40 border-t-white" /> : <CameraIcon className="h-3.5 w-3.5" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              className="hidden"
              onChange={(e) => void handleAvatarChange(e)}
            />
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-slate-900">{displayName}</p>
            <p className="text-sm text-slate-500">@{user?.usernameDisplay}</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <CameraIcon className="h-3.5 w-3.5" />
              Change Photo
            </button>
          </div>
        </div>
        <ErrorText>{avatarError}</ErrorText>
      </Card>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="displayName">Display Name</Label>
            <Input id="displayName" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={user?.usernameDisplay ?? ""} disabled />
            <p className="mt-1.5 text-xs text-slate-500">Usernames can&apos;t be changed yet.</p>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email ?? ""} disabled />
          </div>
          <ErrorText>{error}</ErrorText>
          {saved && !error && <p className="text-sm text-emerald-600">Saved.</p>}
          <Button type="submit" isLoading={updateProfile.isPending}>
            Save Changes
          </Button>
        </form>
      </Card>

      <Card>
        <CardTitle className="mb-4 text-base font-semibold text-slate-900">Preferences</CardTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="currency">Default Currency</Label>
            <Select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="timezone">Time Zone</Label>
            <Input
              id="timezone"
              placeholder="e.g. Asia/Colombo"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Currency and time zone changes are saved with the form above.
        </p>
      </Card>
    </div>
  );
}
