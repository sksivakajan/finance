import { SparkleIcon } from "./icons";

interface Badge {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  className: string;
}

interface AuthIllustrationProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  badges?: Badge[];
  ring?: boolean;
}

export function AuthIllustration({ icon: Icon, badges = [], ring = false }: AuthIllustrationProps) {
  return (
    <div className="relative mx-auto mb-6 h-28 w-28">
      {ring && (
        <span className="absolute inset-0 rounded-full border border-dashed border-indigo-400/30" aria-hidden="true" />
      )}
      <SparkleIcon className="absolute -left-3 top-1 h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
      <SparkleIcon className="absolute -right-2 bottom-6 h-2.5 w-2.5 text-fuchsia-300" aria-hidden="true" />
      <SparkleIcon className="absolute right-4 top-0 h-2 w-2 text-indigo-300" aria-hidden="true" />

      <div className="absolute inset-3 flex items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 shadow-lg shadow-indigo-950/50">
        <Icon className="h-9 w-9 text-white" strokeWidth={1.5} />
      </div>

      {badges.map(({ icon: BadgeIcon, className }, i) => (
        <span
          key={i}
          className={`absolute flex h-8 w-8 items-center justify-center rounded-full text-white shadow-lg ${className}`}
        >
          <BadgeIcon className="h-4 w-4" />
        </span>
      ))}
    </div>
  );
}
