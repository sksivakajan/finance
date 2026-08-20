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

export function ArrowDownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0-5.25-5.25M12 19.5l5.25-5.25" />
    </svg>
  );
}

export function ArrowUpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5v-15m0 0 5.25 5.25M12 4.5 6.75 9.75" />
    </svg>
  );
}

export function InfoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v5.25M12 8.25h.008v.008H12V8.25Z" />
    </svg>
  );
}

export function ChevronRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function PieChartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v9h9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.49 15a9 9 0 1 1-6.49-11.4" />
    </svg>
  );
}

export function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
    </svg>
  );
}

export function FilterIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5l-6.5 7.5v5.25l-3.5 1.75v-6.7l-6.5-7.8Z" />
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

export function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

export function PencilIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L7.5 19.151l-4.5 1 1-4.5L16.862 4.487Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="m15 6.75 2.25 2.25" />
    </svg>
  );
}

export function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 6.75h15m-13 0 .75 12a1.5 1.5 0 0 0 1.5 1.4h6.5a1.5 1.5 0 0 0 1.5-1.4l.75-12M9.75 6.75V4.5a1.5 1.5 0 0 1 1.5-1.5h1.5a1.5 1.5 0 0 1 1.5 1.5v2.25M10 10.75v6M14 10.75v6"
      />
    </svg>
  );
}

export function SendIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 3 3 10.5l7.5 3L13.5 21 21 3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 3 10.5 13.5" />
    </svg>
  );
}

export function BanknoteIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="2.25" y="6.75" width="19.5" height="10.5" rx="2.25" />
      <circle cx="12" cy="12" r="2.25" />
      <path strokeLinecap="round" d="M5.25 9.75h.008M18.75 14.25h.008" />
    </svg>
  );
}

export function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.5v-1.5a4.5 4.5 0 0 0-4.5-4.5H6a4.5 4.5 0 0 0-4.5 4.5v1.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9.75a3.375 3.375 0 1 0 0-6.75 3.375 3.375 0 0 0 0 6.75Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 19.5v-1.5a4.5 4.5 0 0 0-2.5-4.03M13.5 3.2a3.375 3.375 0 0 1 0 6.55" />
    </svg>
  );
}

export function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.25" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 12.4l2.4 2.4 4.6-5.2" />
    </svg>
  );
}

export function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.25" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5v5l3.25 2" />
    </svg>
  );
}

export function BuildingIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.25 21V5.25A1.5 1.5 0 0 1 6.75 3.75h6a1.5 1.5 0 0 1 1.5 1.5V21M5.25 21h13.5M14.25 21v-6a1.5 1.5 0 0 1 1.5-1.5h1.5a1.5 1.5 0 0 1 1.5 1.5v6M8.25 7.5h.008M11.25 7.5h.008M8.25 10.5h.008M11.25 10.5h.008M8.25 13.5h.008M11.25 13.5h.008"
      />
    </svg>
  );
}

export function UserIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0"
      />
    </svg>
  );
}

export function MoreVerticalIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)} strokeWidth={2.25}>
      <path strokeLinecap="round" d="M12 5.25h.008M12 12h.008M12 18.75h.008" />
    </svg>
  );
}

export function LockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 10.5V7.5a5.25 5.25 0 0 1 10.5 0v3M5.25 10.5h13.5A1.5 1.5 0 0 1 20.25 12v7.5a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V12a1.5 1.5 0 0 1 1.5-1.5Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14.75v2.5" />
    </svg>
  );
}

export function PaperclipIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18.375 12.739 10.5 20.614a4.5 4.5 0 1 1-6.364-6.364l7.693-7.693a3 3 0 1 1 4.243 4.243l-7.673 7.673a1.5 1.5 0 0 1-2.122-2.121l7.073-7.073"
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
        d="M2.25 12S5.25 5.25 12 5.25 21.75 12 21.75 12 18.75 18.75 12 18.75 2.25 12 2.25 12Z"
      />
      <circle cx="12" cy="12" r="2.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BellIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.85 23.85 0 0 0 5.454-1.31A8.97 8.97 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.97 8.97 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.26 24.26 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
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

export function PaletteIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3a9 9 0 1 0 0 18c1.104 0 1.5-.75 1.5-1.5 0-.414-.168-.79-.44-1.06a1.5 1.5 0 0 1 1.06-2.56h1.63A3.75 3.75 0 0 0 19.5 12 9 9 0 0 0 12 3Z"
      />
      <circle cx="7.5" cy="10.5" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="11.5" cy="7" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="16" cy="9.5" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LinkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 15 15 9m-4.5-3 1.72-1.72a3.75 3.75 0 1 1 5.3 5.3L15.75 11.25M13.5 19.5l-1.72 1.72a3.75 3.75 0 1 1-5.3-5.3L8.25 14.25"
      />
    </svg>
  );
}

export function CreditCardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="2.25" y="5.25" width="19.5" height="13.5" rx="2.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 9.75h19.5M5.25 14.75h4.5" />
    </svg>
  );
}

export function DatabaseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6c4.556 0 8.25-1.007 8.25-2.25S16.556 1.5 12 1.5 3.75 2.507 3.75 3.75 7.444 6 12 6Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 3.75v6c0 1.243 3.694 2.25 8.25 2.25s8.25-1.007 8.25-2.25v-6M3.75 9.75v6c0 1.243 3.694 2.25 8.25 2.25s8.25-1.007 8.25-2.25v-6M3.75 15.75v4.5c0 1.243 3.694 2.25 8.25 2.25s8.25-1.007 8.25-2.25v-4.5"
      />
    </svg>
  );
}

export function HelpCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.25" strokeLinecap="round" strokeLinejoin="round" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.29c-.66.3-1 .95-1 1.71v.25"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 17h.008v.008H12V17Z" />
    </svg>
  );
}

export function CameraIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 8.25A1.5 1.5 0 0 1 6 6.75h1.379a1.5 1.5 0 0 0 1.06-.44l1.122-1.12a1.5 1.5 0 0 1 1.061-.44h2.756a1.5 1.5 0 0 1 1.06.44l1.122 1.12a1.5 1.5 0 0 0 1.061.44H18a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5v-9Z"
      />
      <circle cx="12" cy="12.75" r="3.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GearIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065Z"
      />
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
