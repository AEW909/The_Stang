import type { Requirement } from "./types";
import type { GameState } from "./state";

// Shared by dialogue choices, exits, and challenges — a flat, deterministic
// threshold check with no dice. See Requirement in types.ts for the two
// shapes (stat or NPC trust) and each consumer for how it applies the result.
export function meetsRequirement(state: GameState, requires: Requirement | undefined): boolean {
  if (!requires) return true;
  if ("stat" in requires) return state.player.stats[requires.stat] >= requires.min;
  return (state.npcState[requires.npcId]?.trust ?? 0) >= requires.minTrust;
}
