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
  | { type: "endEpisode" };

export interface InteractableDef {
  id: string;
  name: string;
  examineText: string;
  takeable?: boolean;
  itemId?: string;
  /** For plot objects (e.g. a note) where examining it triggers story effects. */
  onExamineEffects?: EngineEffect[];
}

export interface ExitDef {
  /** Words the player can use to reach this exit: directions and/or names. */
  aliases: string[];
  targetRoomId: string;
  locked?: boolean;
  lockedText?: string;
  /** Essential item id that unlocks this exit via USE. */
  unlocksWithItemId?: string;
  /** Flag that must be true to pass through; if false, lockedText is shown. */
  requiresFlag?: string;
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

export interface EpisodeDef {
  id: string;
  number: number;
  title: string;
  prerequisites: string[];
  scenes: SceneDef[];
  items: ItemDef[];
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
