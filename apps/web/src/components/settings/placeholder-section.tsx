import { Card } from "@/components/ui/card";

export function PlaceholderSection({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <Card className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Icon className="h-6 w-6" />
        </span>
        <p className="text-sm font-semibold text-slate-900">Coming soon</p>
        <p className="max-w-sm text-sm text-slate-500">We&apos;re still building this. Check back in a future update.</p>
      </Card>
    </div>
  );
}
