import packageJson from "../../../package.json";
import { Card } from "@/components/ui/card";

export function AboutSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">About</h2>
        <p className="text-sm text-slate-500">Information about this app.</p>
      </div>

      <Card className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-lg font-bold text-white">
          F
        </span>
        <div>
          <p className="text-base font-semibold text-slate-900">Finance</p>
          <p className="text-sm text-slate-500">Version {packageJson.version}</p>
        </div>
      </Card>

      <Card>
        <p className="text-sm text-slate-600">
          Finance helps you track income and expenses, manage loans, split bills with friends, and stay on top of
          your money in one place.
        </p>
      </Card>
    </div>
  );
}
