"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/cn";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { AccountSection } from "@/components/settings/account-section";
import { SecuritySection } from "@/components/settings/security-section";
import { PrivacySection } from "@/components/settings/privacy-section";
import { DataStorageSection } from "@/components/settings/data-section";
import { HelpSection } from "@/components/settings/help-section";
import { AboutSection } from "@/components/settings/about-section";
import { PlaceholderSection } from "@/components/settings/placeholder-section";
import {
  UserIcon,
  ShieldIcon,
  BellIcon,
  PaletteIcon,
  LockIcon,
  LinkIcon,
  CreditCardIcon,
  DatabaseIcon,
  HelpCircleIcon,
  InfoIcon,
  ChevronRightIcon,
} from "@/components/dashboard/icons";

interface Section {
  id: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  render: () => React.ReactNode;
}

const SECTIONS: Section[] = [
  { id: "account", label: "Account", icon: UserIcon, render: () => <AccountSection /> },
  { id: "security", label: "Security", icon: ShieldIcon, render: () => <SecuritySection /> },
  {
    id: "notifications",
    label: "Notifications",
    icon: BellIcon,
    render: () => <PlaceholderSection title="Notifications" description="Choose what you get notified about." icon={BellIcon} />,
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: PaletteIcon,
    render: () => <PlaceholderSection title="Appearance" description="Customize how Finance looks." icon={PaletteIcon} />,
  },
  { id: "privacy", label: "Privacy", icon: LockIcon, render: () => <PrivacySection /> },
  {
    id: "linked-accounts",
    label: "Linked Accounts",
    icon: LinkIcon,
    render: () => <PlaceholderSection title="Linked Accounts" description="Connect other accounts to Finance." icon={LinkIcon} />,
  },
  {
    id: "payment-methods",
    label: "Payment Methods",
    icon: CreditCardIcon,
    render: () => <PlaceholderSection title="Payment Methods" description="Manage saved payment methods." icon={CreditCardIcon} />,
  },
  { id: "data-storage", label: "Data & Storage", icon: DatabaseIcon, render: () => <DataStorageSection /> },
  { id: "help-support", label: "Help & Support", icon: HelpCircleIcon, render: () => <HelpSection /> },
  { id: "about", label: "About", icon: InfoIcon, render: () => <AboutSection /> },
];

function SectionNavList({ activeId, onSelect }: { activeId: string; onSelect: (id: string) => void }) {
  return (
    <nav className="space-y-1">
      {SECTIONS.map((section) => {
        const active = section.id === activeId;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onSelect(section.id)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
              active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50",
            )}
          >
            <section.icon className="h-4.5 w-4.5 shrink-0" />
            {section.label}
          </button>
        );
      })}
    </nav>
  );
}

function SettingsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const requested = searchParams.get("section");
  const initial = SECTIONS.some((s) => s.id === requested) ? (requested as string) : "account";

  const [activeId, setActiveId] = useState(initial);
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName = user?.profile?.displayName || user?.usernameDisplay || "";
  const active = SECTIONS.find((s) => s.id === activeId) ?? SECTIONS[0];

  function select(id: string) {
    setActiveId(id);
    setMobileOpen(true);
  }

  return (
    <div>
      {/* Mobile: index list, or drilled-in section */}
      <div className="md:hidden">
        {mobileOpen ? (
          <div>
            <div className="sticky top-0 z-10 -mx-4 mb-4 flex items-center gap-3 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Back to settings"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <ChevronRightIcon className="h-5 w-5 rotate-180" />
              </button>
              <p className="truncate text-base font-semibold text-slate-900">{active.label}</p>
            </div>
            {active.render()}
          </div>
        ) : (
          <div>
            <MobileHeader title="Settings" subtitle="Manage your account and preferences" />
            <button
              type="button"
              onClick={() => select("account")}
              className="mb-4 flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm"
            >
              <Avatar name={displayName} src={user?.profile?.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
                <p className="truncate text-xs text-slate-500">@{user?.usernameDisplay}</p>
              </div>
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
            <Card className="divide-y divide-slate-100 p-0">
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => select(section.id)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <section.icon className="h-4.5 w-4.5 shrink-0 text-slate-400" />
                  <span className="flex-1">{section.label}</span>
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-300" />
                </button>
              ))}
            </Card>
          </div>
        )}
      </div>

      {/* Desktop: two-pane layout */}
      <div className="hidden md:block">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            <p className="text-sm text-slate-500">Manage your account and preferences</p>
          </div>
        </div>
        <div className="grid grid-cols-[220px_1fr] gap-6">
          <Card className="h-fit p-3">
            <SectionNavList activeId={activeId} onSelect={setActiveId} />
          </Card>
          <div>{active.render()}</div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
