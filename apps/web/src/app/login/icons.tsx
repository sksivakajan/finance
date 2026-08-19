// Hand-drawn inline SVGs for the login page redesign — kept local to this
// route rather than a shared icon library, since this is the only place
// that currently needs line icons instead of the emoji used elsewhere in
// the app (nav, notification bell, chat attachments).

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

export function ShieldIcon(props: React.SVGProps<SVGSVGElement>) {
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

export function GlobeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0c-1.933 0-3.5-4.03-3.5-9S10.067 3 12 3s3.5 4.03 3.5 9-1.567 9-3.5 9ZM3.25 9h17.5M3.25 15h17.5"
      />
    </svg>
  );
}

export function ChevronDownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function GoogleLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.39l4.01-3.11Z" />
      <path fill="#EA4335" d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.26 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z" />
    </svg>
  );
}

export function AppleLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" {...props}>
      <path d="M16.36 1.43c0 1.14-.42 2.2-1.24 3.05-.85.87-2.06 1.5-3.13 1.44-.13-1.11.4-2.28 1.2-3.09.83-.85 2.14-1.44 3.17-1.4Zm3.35 16.9c-.5 1.16-.75 1.68-1.4 2.7-.9 1.44-2.18 3.24-3.75 3.25-1.4.02-1.76-.9-3.66-.9-1.9.01-2.3.92-3.7.9-1.57-.02-2.78-1.63-3.68-3.07-2.53-4.02-2.79-8.72-1.23-11.22 1.1-1.77 2.85-2.81 4.5-2.81 1.68 0 2.74.94 4.13.94 1.35 0 2.17-.94 4.13-.94 1.47 0 3.03.8 4.14 2.18-3.64 2-3.05 7.2.52 8.97Z" />
    </svg>
  );
}

export function FacebookLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path fill="#fff" d="M15.4 12.5h-2.1V20h-3.1v-7.5H8.8v-2.7h1.4V8.1c0-1.8 1-3.1 3.2-3.1h2.2v2.7h-1.4c-.5 0-.9.2-.9.9v1.2h2.3l-.2 2.7Z" />
    </svg>
  );
}
