import { cn } from "@/lib/cn";

const SIZES = {
  sm: "h-9 w-9 text-sm",
  md: "h-14 w-14 text-lg",
  lg: "h-20 w-20 text-2xl",
} as const;

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const initial = name.charAt(0).toUpperCase() || "?";

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- avatars are user-uploaded, arbitrary-origin URLs from our own /uploads API
    return <img src={src} alt="" className={cn("shrink-0 rounded-full object-cover", SIZES[size], className)} />;
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 font-semibold text-white",
        SIZES[size],
        className,
      )}
    >
      {initial}
    </span>
  );
}
