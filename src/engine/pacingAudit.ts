import type { EngineEffect, EpisodeDef, ExitDef, RoomDef } from "./types";

// Effect types that indicate something narratively consequential happened,
// as opposed to pure flavour (examine text with no effects, a takeable item
// that doesn't touch story state). Deliberately excludes addItem/removeItem/
// goTo, which are routine bookkeeping, not a "something happened here" beat.
const CONSEQUENTIAL_EFFECT_TYPES = new Set<EngineEffect["type"]>([
  "setFlag",
  "setDecision",
  "adjustTrust",
  "adjustHonesty",
  "joinParty",
  "leaveParty",
  "endEpisode",
]);

function hasConsequentialEffects(effects: EngineEffect[] | undefined): boolean {
  return !!effects?.some((e) => CONSEQUENTIAL_EFFECT_TYPES.has(e.type));
}

/** An "obstacle" room is one where either (a) getting past it requires more
 * than a single unconditional `go` — at least one exit is gated somehow — or
 * (b) something in the room has a real narrative consequence (a taken/examined
 * object that sets a flag, records a decision, shifts trust, etc.), even if it
 * doesn't block progress. This is a direct automated version of
 * VERIFICATION_CHECKLIST.md item 12: a cheap first-pass signal, not a
 * substitute for judging whether an obstacle is actually fun — a gated exit
 * that's trivial to pass, or a flag nobody will ever notice, still count here. */
export function isObstacleRoom(room: RoomDef): boolean {
  const hasGatedExit = room.exits.some(
    (e: ExitDef) => !!(e.unlocksWithItemId || e.requiresFlag || e.requires || e.requiresRun),
  );
  if (hasGatedExit) return true;

  return room.interactables.some(
    (i) => hasConsequentialEffects(i.onTakeEffects) || hasConsequentialEffects(i.onExamineEffects) || hasConsequentialEffects(i.onUseEffects),
  );
}

export interface PacingAudit {
  report: string[];
  maxGap: number;
}

/** Walks an episode's rooms in authored (scene, then room) order and finds
 * the longest run of consecutive non-obstacle rooms. */
export function auditPacing(episode: EpisodeDef): PacingAudit {
  const rooms = episode.scenes.flatMap((scene) => scene.rooms.map((room) => ({ scene: scene.id, room })));

  let sinceLastObstacle = 0;
  let maxGap = 0;
  const report: string[] = [];

  rooms.forEach(({ scene, room }, i) => {
    const obstacle = isObstacleRoom(room);
    if (obstacle) {
      maxGap = Math.max(maxGap, sinceLastObstacle);
      sinceLastObstacle = 0;
    } else {
      sinceLastObstacle += 1;
    }
    report.push(`${i + 1}. [${scene}] ${room.name} — ${obstacle ? "OBSTACLE" : "flavour only"}`);
  });
  maxGap = Math.max(maxGap, sinceLastObstacle); // trailing gap, if the episode ends without one

  return { report, maxGap };
}
