function base(props: React.SVGProps<SVGSVGElement>) {
  return { fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.75, stroke: "currentColor", ...props };
}

export function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 8.25a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5a6.75 6.75 0 0 1 13.5 0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6a2.5 2.5 0 0 1 0 5M19.5 19.5a5.25 5.25 0 0 0-3.25-4.86" />
    </svg>
  );
}
