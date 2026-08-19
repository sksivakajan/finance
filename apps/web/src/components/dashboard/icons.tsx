function base(props: React.SVGProps<SVGSVGElement>) {
  return { fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.75, stroke: "currentColor", ...props };
}

export function WalletIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7.5A2.25 2.25 0 0 1 5.25 5.25h10.5A2.25 2.25 0 0 1 18 7.5v1.125M3 7.5v9.75A2.25 2.25 0 0 0 5.25 19.5h13.5A2.25 2.25 0 0 0 21 17.25V10.5a1.5 1.5 0 0 0-1.5-1.5h-3.75a2.25 2.25 0 0 0 0 4.5H21"
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

export function TrendDownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6.75 9 13l4-4 8 8.5M16.5 17.5H21V13" />
    </svg>
  );
}

export function PiggyBankIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12a6 6 0 0 1 6-6h3a5.25 5.25 0 0 1 5.25 5.25v.75l2.25.75-1.5 1.5h-.75v1.5a2.25 2.25 0 0 1-2.25 2.25h-.75v1.5h-2.25v-1.5h-3v1.5H8.25v-1.9A6 6 0 0 1 4.5 12Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 10.5h.008M8.25 6 9 4.5h2.25" />
    </svg>
  );
}

export function CalendarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v3M17.25 3v3M3.75 8.25h16.5M5.25 5.25h13.5A1.5 1.5 0 0 1 20.25 6.75v12A1.5 1.5 0 0 1 18.75 20.25H5.25A1.5 1.5 0 0 1 3.75 18.75v-12A1.5 1.5 0 0 1 5.25 5.25Z"
      />
    </svg>
  );
}

export function SparkleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 3.5 10.3 7 13.8 8.3 10.3 9.6 9 13.1 7.7 9.6 4.2 8.3 7.7 7 9 3.5Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 12.5 17.8 14.7 20 15.5 17.8 16.3 17 18.5 16.2 16.3 14 15.5 16.2 14.7 17 12.5Z" />
    </svg>
  );
}

export function ArrowUpRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17 17 7M8.5 7H17v8.5" />
    </svg>
  );
}
