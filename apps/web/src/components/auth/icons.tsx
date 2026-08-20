// Shared line icons + brand logos for the auth pages (login, register,
// forgot/reset password, verify email). Centralized here since all of
// these routes now share the same dark-card visual language.

function base(props: React.SVGProps<SVGSVGElement>) {
  return { fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.75, stroke: "currentColor", ...props };
}

export function UserIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

export function AtIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm0 0v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-4.5 7.79"
      />
    </svg>
  );
}

export function EnvelopeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 6.75A2.25 2.25 0 0 1 4.5 4.5h15a2.25 2.25 0 0 1 2.25 2.25v10.5A2.25 2.25 0 0 1 19.5 19.5h-15a2.25 2.25 0 0 1-2.25-2.25V6.75Zm0 0 9.75 6.75 9.75-6.75"
      />
    </svg>
  );
}

export function LockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V7.5a4.5 4.5 0 1 0-9 0v3M5.25 10.5h13.5a.75.75 0 0 1 .75.75v9a.75.75 0 0 1-.75.75H5.25a.75.75 0 0 1-.75-.75v-9a.75.75 0 0 1 .75-.75Z"
      />
    </svg>
  );
}

export function EyeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12s3.75-7.5 9.75-7.5 9.75 7.5 9.75 7.5-3.75 7.5-9.75 7.5S2.25 12 2.25 12Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

export function EyeOffIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M9.88 4.6A9.77 9.77 0 0 1 12 4.5c6 0 9.75 7.5 9.75 7.5a17.6 17.6 0 0 1-3.1 4.15M6.5 6.6C4.3 8.1 2.25 10.5 2.25 10.5S6 18 12 18c1.13 0 2.19-.16 3.16-.44"
      />
    </svg>
  );
}

export function ShieldIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2.25 4.5 5.25v6c0 5.056 3.24 8.94 7.5 10.5 4.26-1.56 7.5-5.444 7.5-10.5v-6L12 2.25Z"
      />
    </svg>
  );
}

export function ShieldCheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2.25 4.5 5.25v6c0 5.056 3.24 8.94 7.5 10.5 4.26-1.56 7.5-5.444 7.5-10.5v-6L12 2.25Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.25 12l1.9 1.9 3.6-3.9" />
    </svg>
  );
}

export function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

export function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0-6-6m6 6-6 6" />
    </svg>
  );
}

export function ChevronLeftIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m15 6-6 6 6 6" />
    </svg>
  );
}

export function PaperPlaneIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 2.25 10.5 13.5M21.75 2.25 14.75 21.75l-4.25-8.25-8.25-4.25 19.5-6.75Z" />
    </svg>
  );
}

export function WalletIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 8.25a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 20.25 8.25v9a2.25 2.25 0 0 1-2.25 2.25H4.5a2.25 2.25 0 0 1-2.25-2.25v-9Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 13.5h.008v.008h-.008V13.5ZM2.25 9h19.5" />
    </svg>
  );
}

export function DollarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v12m3.5-9.5c0-1.38-1.567-2.5-3.5-2.5s-3.5 1.12-3.5 2.5S10.067 11 12 11s3.5 1.12 3.5 2.5-1.567 2.5-3.5 2.5-3.5-1.12-3.5-2.5"
      />
    </svg>
  );
}

export function TrendUpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17.25 9 11l4 4 8-8.5M16.5 6.5H21v4.5" />
    </svg>
  );
}

export function ChartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v16.5A1.5 1.5 0 0 0 4.5 21H21M7.5 15.75V12M12.75 15.75V8.25M18 15.75V4.5" />
    </svg>
  );
}

export function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.5a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3M12.75 9.75a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0ZM16.5 16.5a2.625 2.625 0 0 0-2.625-2.625M21 19.5a2.625 2.625 0 0 0-2.625-2.625M18.375 9.75a2.25 2.25 0 1 1-3.75-1.672"
      />
    </svg>
  );
}

export function ChatIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 12h.008v.008H8.25V12Zm3.75 0h.008v.008H12V12Zm3.75 0h.008v.008h-.008V12ZM21 12c0 4.556-4.03 8.25-9 8.25a9.76 9.76 0 0 1-3.253-.555L3 21l1.395-4.185A8.19 8.19 0 0 1 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
      />
    </svg>
  );
}

export function SparkleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2.5 13.9 9l6.6 1.9-6.6 1.9L12 19.4l-1.9-6.6L3.5 10.9l6.6-1.9L12 2.5Z" />
    </svg>
  );
}
