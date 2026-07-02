// Pure data-shape definitions for the campaign/episode content and the runtime
// game state. No React/DOM imports allowed anywhere in src/engine.

export type StatName = "bravery" | "fight" | "flight" | "smarts" | "charm";

export const STAT_NAMES: StatName[] = [
  "bravery",
  "fight",
  "flight",
  "smarts",
  "charm",
];

export type StatBlock = Record<StatName, number>;

export interface PointBuyConfig {
  base: number;
  pool: number;
  min: number;
  max: number;
}

export interface LocationDef {
  id: string;
  name: string;
  /** If set, this location cannot be entered until the named flag is true. */
  unlockFlag?: string;
}

export interface NpcDef {
  id: string;
  name: string;
  description: string;
  skillTag?: string;
  trust: number;
  honesty: number;
}

export type StoryFlags = Record<string, boolean>;

export type ItemTag = "essential" | "flavour";

export interface EssentialUse {
  /** The exit id, or interactable id, this item is meant to be used on. */
  targetId: string;
  result: string;
  effects?: EngineEffect[];
}

export interface FlavourUseOutcome {
  sceneId: string;
  /** If omitted, this outcome applies to a bare USE in the given scene. */
  targetId?: string;
  result: string;
  effects?: EngineEffect[];
}

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  tag: ItemTag;
  takeText?: string;
  essentialUse?: EssentialUse;
  /** Shown for any essential-item USE that doesn't match essentialUse.targetId. */
  wrongUseText?: string;
  flavourUses?: FlavourUseOutcome[];
  /** Shown for any flavour-item USE with no authored outcome for the context. */
  fallbackUseText?: string;
}

export type EngineEffect =
  | { type: "setFlag"; flag: string; value: boolean }
  | { type: "addItem"; itemId: string }
  | { type: "removeItem"; itemId: string }
  | { type: "goTo"; roomId: string }
  | { type: "endEpisode" }
  /** Shifts an NPC's live trust value (clamped 0-100). See docs/CAMPAIGN_BIBLE.md's NPC roster for starting values. */
  | { type: "adjustTrust"; npcId: string; delta: number }
  /** Shifts an NPC's live honesty value (clamped 0-100) — separate from trust; see Isabella in the campaign bible. */
  | { type: "adjustHonesty"; npcId: string; delta: number }
  /** Records a value-bearing choice (e.g. which friend Harper sent for help) — not a plain yes/no flag. */
  | { type: "setDecision"; key: string; value: string }
  | { type: "joinParty"; npcId: string }
  | { type: "leaveParty"; npcId: string };

export interface InteractableDef {
  id: string;
  name: string;
  examineText: string;
  /** Shown instead of examineText while this interactable is open. Defaults to examineText. */
  openExamineText?: string;
  /** Fragment used in the room's auto-generated "You can also see" list, e.g. "A FIRE EXTINGUISHER on the wall." Defaults to name if omitted. */
  shortDescription?: string;
  /** Shown instead of shortDescription while this interactable is open. Defaults to shortDescription. */
  openShortDescription?: string;
  /** Excludes this interactable from the auto-generated list — for NPCs and plot-critical
   * objects (e.g. Camille's note) that deserve full authored prose instead of a bullet. */
  excludeFromList?: boolean;
  /** If set, this interactable is only visible/matchable while the named interactable
   * (by id, same room) is open — e.g. a key that lives inside a drawer. */
  containedIn?: string;
  takeable?: boolean;
  itemId?: string;
  /** For plot objects (e.g. a note) where examining it triggers story effects. */
  onExamineEffects?: EngineEffect[];
  /** Fires when this item is successfully taken — e.g. picking up a keepsake
   * that also sets a flag something else reacts to. */
  onTakeEffects?: EngineEffect[];
  openable?: boolean;
  /** Starts open; defaults to false (closed) when openable. */
  startsOpen?: boolean;
  openText?: string;
  closeText?: string;
  /** Lets USE apply to this interactable directly (a fixed-in-place lever,
   * button, switch — not something you TAKE first). If neither this nor
   * useText is set, USE on this interactable just says "Nothing happens." */
  onUseEffects?: EngineEffect[];
  useText?: string;
}

/** Deterministic gate — no dice: a flat threshold on one of Harper's stats or an
 * NPC's live trust. Used by both dialogue choices (see DialogueChoice) and exits
 * (see ExitDef), which apply it with different semantics — see each for details. */
export type Requirement = { stat: StatName; min: number } | { npcId: string; minTrust: number };

export interface ExitDef {
  /** Words the player can use to reach this exit: directions and/or names. */
  aliases: string[];
  targetRoomId: string;
  lockedText?: string;
  /** Essential item id that unlocks this exit via USE. */
  unlocksWithItemId?: string;
  /** Flag that must be true to pass through; if false, lockedText is shown. */
  requiresFlag?: string;
  /** Deterministic stat/trust gate (see Requirement) — unlike a dialogue choice,
   * an exit with `requires` stays visible/attemptable either way; failing it is a
   * real, recoverable outcome (the tension mechanic), not a hidden bonus path. */
  requires?: Requirement;
  /** Narration shown (before the destination room's description) when passage succeeds. */
  successText?: string;
  /** Shown instead of successText when the named flag is true — e.g. a tenser
   * narration for the same exit once an earlier story beat has happened. */
  alternateSuccessText?: { flag: string; text: string };
  /** Timed-dash exits: this exit only succeeds via the RUN verb, not GO/WALK.
   * Meant to be combined with requiresFlag (the "window" a switch/lever
   * opens) — if the flag is true but the player didn't run, the window
   * slams shut again (requiresFlag is cleared) and wrongRunText is shown
   * instead of the plain lockedText, so retrying means re-opening the window. */
  requiresRun?: boolean;
  wrongRunText?: string;
  /** Effects applied (in addition to moving the player) when passage succeeds. */
  onSuccess?: EngineEffect[];
}

export interface RoomDef {
  id: string;
  name: string;
  locationId: string;
  description: string;
  interactables: InteractableDef[];
  exits: ExitDef[];
}

export interface SceneDef {
  id: string;
  title: string;
  rooms: RoomDef[];
  startRoomId: string;
}

/** For dialogue specifically: a gated choice must only ever add flavour/reward
 * (e.g. bonus trust), staying hidden until qualified — never the only way to
 * advance a node. Every DialogueNode needs at least one unconditional choice
 * so a gate can never block story progress (enforced by validateDialogueTree
 * in engine/dialogue.ts). Contrast with ExitDef.requires. */
export interface DialogueChoice {
  id: string;
  label: string;
  npcResponse: string;
  /** Omit to end the conversation after this choice. */
  nextNodeId?: string;
  effects?: EngineEffect[];
  requires?: Requirement;
}

export interface DialogueNode {
  id: string;
  npcLine: string;
  choices: DialogueChoice[];
}

export interface DialogueTree {
  id: string;
  /** Campaign NPC id this tree belongs to. */
  npcId: string;
  /** Which scene this tree is offered in when the player TALKs to the NPC. */
  sceneId: string;
  startNodeId: string;
  nodes: DialogueNode[];
}

export interface EpisodeDef {
  id: string;
  number: number;
  title: string;
  prerequisites: string[];
  scenes: SceneDef[];
  items: ItemDef[];
  dialogues: DialogueTree[];
  startSceneId: string;
  endingText: string;
}

export interface Campaign {
  locations: Record<string, LocationDef>;
  npcs: Record<string, NpcDef>;
  statNames: StatName[];
  pointBuy: PointBuyConfig;
  initialFlags: StoryFlags;
}
