import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { MobileChatFab } from "./mobile-chat-fab";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-x-hidden pb-20 md:pb-0">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 md:py-6 lg:px-8">{children}</div>
      </main>
      <MobileNav />
      <MobileChatFab />
    </div>
  );
}
