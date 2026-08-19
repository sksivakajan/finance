import type { SplitEditorState } from "@/lib/split";
import type { FriendUser } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const METHOD_LABELS: Record<string, string> = {
  EQUAL: "Split equally",
  EXACT: "Exact amounts",
  PERCENTAGE: "Percentages",
  SHARES: "Shares (e.g. 2:1:1)",
};

export function SplitEditor({
  people,
  currency,
  value,
  onChange,
}: {
  /** The candidate participants (friends, or a group's members). */
  people: FriendUser[];
  currency: string;
  value: SplitEditorState;
  onChange: (next: SplitEditorState) => void;
}) {
  function toggleParticipant(userId: string) {
    const selected = value.participantIds.includes(userId);
    onChange({
      ...value,
      participantIds: selected ? value.participantIds.filter((id) => id !== userId) : [...value.participantIds, userId],
    });
  }

  function setPerPersonValue(map: "amounts" | "percentages" | "units", userId: string, v: string) {
    onChange({ ...value, [map]: { ...value[map], [userId]: v } });
  }

  const percentTotal = value.participantIds.reduce((sum, id) => sum + Number(value.percentages[id] ?? "0"), 0);

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-3">
      <div>
        <Label htmlFor="split-method">Split method</Label>
        <Select
          id="split-method"
          value={value.splitMethod}
          onChange={(e) => onChange({ ...value, splitMethod: e.target.value as SplitEditorState["splitMethod"] })}
        >
          {Object.entries(METHOD_LABELS).map(([method, label]) => (
            <option key={method} value={method}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label>Who&apos;s in on this?</Label>
        <div className="space-y-1.5">
          {people.map((p) => {
            const checked = value.participantIds.includes(p.id);
            return (
              <div key={p.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`participant-${p.id}`}
                  checked={checked}
                  onChange={() => toggleParticipant(p.id)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor={`participant-${p.id}`} className="flex-1 text-sm text-slate-700">
                  {p.displayName ?? p.usernameDisplay}
                </label>
                {checked && value.splitMethod === "EXACT" && (
                  <Input
                    aria-label={`Amount for ${p.displayName ?? p.usernameDisplay}`}
                    inputMode="decimal"
                    placeholder={`0.00 ${currency}`}
                    value={value.amounts[p.id] ?? ""}
                    onChange={(e) => setPerPersonValue("amounts", p.id, e.target.value)}
                    className="w-28"
                  />
                )}
                {checked && value.splitMethod === "PERCENTAGE" && (
                  <Input
                    aria-label={`Percentage for ${p.displayName ?? p.usernameDisplay}`}
                    inputMode="decimal"
                    placeholder="0%"
                    value={value.percentages[p.id] ?? ""}
                    onChange={(e) => setPerPersonValue("percentages", p.id, e.target.value)}
                    className="w-20"
                  />
                )}
                {checked && value.splitMethod === "SHARES" && (
                  <Input
                    aria-label={`Share count for ${p.displayName ?? p.usernameDisplay}`}
                    inputMode="numeric"
                    placeholder="1"
                    value={value.units[p.id] ?? ""}
                    onChange={(e) => setPerPersonValue("units", p.id, e.target.value)}
                    className="w-16"
                  />
                )}
              </div>
            );
          })}
        </div>
        {value.participantIds.length === 0 && (
          <p className="mt-1 text-xs text-slate-500">Pick at least one person to split with.</p>
        )}
        {value.splitMethod === "PERCENTAGE" && value.participantIds.length > 0 && (
          <p className={`mt-1 text-xs ${percentTotal === 100 ? "text-emerald-700" : "text-amber-600"}`}>
            Total: {percentTotal}% {percentTotal !== 100 && "(must add up to 100%)"}
          </p>
        )}
      </div>
    </div>
  );
}
