function base(props: React.SVGProps<SVGSVGElement>) {
  return { fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.75, stroke: "currentColor", ...props };
}

export function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10.5 12 3l9 7.5M5.25 9v10.5A.75.75 0 0 0 6 20.25h4.5v-6h3v6H18a.75.75 0 0 0 .75-.75V9"
      />
    </svg>
  );
}

export function ChatBubbleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12c0 4.556-4.03 8.25-9 8.25a9.76 9.76 0 0 1-3.253-.555L3 21l1.395-4.185A8.19 8.19 0 0 1 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
      />
    </svg>
  );
}

export function LogoutIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 8.25V6.75A2.25 2.25 0 0 1 10.5 4.5h6a2.25 2.25 0 0 1 2.25 2.25v10.5a2.25 2.25 0 0 1-2.25 2.25h-6a2.25 2.25 0 0 1-2.25-2.25v-1.5M3 12h12m0 0-3.75-3.75M15 12l-3.75 3.75"
      />
    </svg>
  );
}

/** Decorative mountain/night-sky art anchored to the bottom of the sidebar. */
export function SidebarIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 260" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden="true">
      <circle cx="176" cy="46" r="14" fill="white" fillOpacity="0.12" />
      <circle cx="60" cy="70" r="2" fill="white" fillOpacity="0.5" />
      <circle cx="200" cy="90" r="1.6" fill="white" fillOpacity="0.4" />
      <circle cx="90" cy="40" r="1.4" fill="white" fillOpacity="0.35" />
      <path d="M-10 220 L70 100 L120 160 L150 120 L266 220 Z" fill="white" fillOpacity="0.06" />
      <path d="M-10 240 L50 150 L100 190 L150 130 L200 190 L266 150 L266 240 Z" fill="white" fillOpacity="0.1" />
    </svg>
  );
}
