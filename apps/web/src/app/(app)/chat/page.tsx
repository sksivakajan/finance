function ChatPlaceholderIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect x="8" y="12" width="38" height="28" rx="8" fill="#ede9fe" />
      <path d="M16 40 12 48 26 40Z" fill="#ede9fe" />
      <circle cx="20" cy="26" r="2.25" fill="#a78bfa" />
      <circle cx="27" cy="26" r="2.25" fill="#a78bfa" />
      <circle cx="34" cy="26" r="2.25" fill="#a78bfa" />
      <rect x="22" y="26" width="34" height="24" rx="8" fill="#c4b5fd" />
      <path d="M30 50 26 58 40 50Z" fill="#c4b5fd" />
      <circle cx="32" cy="38" r="2" fill="#4c1d95" />
      <circle cx="39" cy="38" r="2" fill="#4c1d95" />
      <circle cx="46" cy="38" r="2" fill="#4c1d95" />
    </svg>
  );
}

export default function ChatPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <ChatPlaceholderIllustration />
      <p className="text-sm font-semibold text-slate-900">Select a conversation</p>
      <p className="max-w-xs text-sm text-slate-500">
        Pick someone from the list, or head to your friends list to start a new chat.
      </p>
    </div>
  );
}
