import { toMinorUnits } from "./money";
import type { SplitMethod } from "./types";

export interface SplitEditorState {
  splitMethod: SplitMethod;
  participantIds: string[];
  amounts: Record<string, string>;
  percentages: Record<string, string>;
  units: Record<string, string>;
}

export function emptySplitState(): SplitEditorState {
  return { splitMethod: "EQUAL", participantIds: [], amounts: {}, percentages: {}, units: {} };
}

/** Converts the editor's display-string state into the wire fields the
 * create/update expense endpoint expects for whichever method is active. */
export function splitStateToRequestFields(state: SplitEditorState) {
  switch (state.splitMethod) {
    case "EQUAL":
      return { splitMethod: "EQUAL" as const, participantIds: state.participantIds };
    case "EXACT":
      return {
        splitMethod: "EXACT" as const,
        exactShares: state.participantIds.map((id) => ({
          userId: id,
          shareMinor: toMinorUnits(state.amounts[id] ?? "0"),
        })),
      };
    case "PERCENTAGE":
      return {
        splitMethod: "PERCENTAGE" as const,
        percentageShares: state.participantIds.map((id) => ({
          userId: id,
          percentageBps: Math.round(Number(state.percentages[id] ?? "0") * 100),
        })),
      };
    case "SHARES":
      return {
        splitMethod: "SHARES" as const,
        unitShares: state.participantIds.map((id) => ({
          userId: id,
          shareUnits: Math.max(1, Math.round(Number(state.units[id] ?? "1"))),
        })),
      };
    default:
      return { splitMethod: "NONE" as const };
  }
}
