"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";
import { useUpdateProfile } from "@/lib/hooks/use-settings";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ErrorText } from "@/components/ui/error-text";

type Audience = "EVERYONE" | "FRIENDS" | "NOBODY";

const AUDIENCE_LABELS: Record<Audience, string> = {
  EVERYONE: "Everyone",
  FRIENDS: "Friends only",
  NOBODY: "No one",
};

const FIELDS: { key: "whoCanFriendRequest" | "whoCanMessage" | "whoCanSeeProfile" | "whoCanAddToGroups"; label: string; description: string }[] = [
  { key: "whoCanSeeProfile", label: "Who can see your profile", description: "Controls who can view your display name and activity." },
  { key: "whoCanFriendRequest", label: "Who can send you friend requests", description: "Limit who's allowed to add you as a friend." },
  { key: "whoCanMessage", label: "Who can message you", description: "Controls who can start a chat with you." },
  { key: "whoCanAddToGroups", label: "Who can add you to groups", description: "Controls who can include you in a shared expense group." },
];

export function PrivacySection() {
  const { user, refreshUser } = useAuth();
  const updateProfile = useUpdateProfile();
  const [error, setError] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  async function handleChange(key: (typeof FIELDS)[number]["key"], value: Audience) {
    setError(null);
    setSavedKey(null);
    try {
      await updateProfile.mutateAsync({ [key]: value });
      await refreshUser();
      setSavedKey(key);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Privacy</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Control who can find you and interact with you.</p>
      </div>

      <Card className="space-y-5">
        {FIELDS.map((field) => (
          <div key={field.key} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label className="mb-0">{field.label}</Label>
              <p className="text-xs text-slate-500 dark:text-slate-400">{field.description}</p>
            </div>
            <div className="flex items-center gap-2 sm:w-48 sm:shrink-0">
              <Select
                value={user?.profile?.[field.key] ?? "EVERYONE"}
                onChange={(e) => void handleChange(field.key, e.target.value as Audience)}
              >
                {(Object.keys(AUDIENCE_LABELS) as Audience[]).map((a) => (
                  <option key={a} value={a}>
                    {AUDIENCE_LABELS[a]}
                  </option>
                ))}
              </Select>
              {savedKey === field.key && <span className="shrink-0 text-xs text-emerald-600">Saved</span>}
            </div>
          </div>
        ))}
        <ErrorText>{error}</ErrorText>
      </Card>
    </div>
  );
}
