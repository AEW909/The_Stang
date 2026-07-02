import type { Campaign, EpisodeDef, ItemDef, RoomDef, SceneDef, StatBlock, StoryFlags } from "./types";

export interface PlayerProfile {
  name: string;
  stats: StatBlock;
}

export interface NpcRuntimeState {
  trust: number;
  honesty: number;
}

export interface ActiveDialogue {
  treeId: string;
  nodeId: string;
}

export interface Checkpoint {
  sceneId: string;
  roomId: string;
  inventory: string[];
  flags: StoryFlags;
  /** Open/closed state of openable interactables, keyed by "roomId:interactableId". */
  openState: Record<string, boolean>;
  npcState: Record<string, NpcRuntimeState>;
  decisions: Record<string, string>;
  party: string[];
  resolvedChallenges: string[];
}

export interface GameState {
  version: 1;
  player: PlayerProfile;
  flags: StoryFlags;
  inventory: string[];
  currentSceneId: string;
  currentRoomId: string;
  openState: Record<string, boolean>;
  npcState: Record<string, NpcRuntimeState>;
  decisions: Record<string, string>;
  party: string[];
  /** Non-null while a menu-driven conversation is active; not checkpointed —
   * a checkpoint is always taken at a scene's start, before any dialogue
   * within it could have begun, so restarting naturally exits a conversation. */
  activeDialogue: ActiveDialogue | null;
  /** Non-null while a key-decision/skill-check is open for numbered-input
   * resolution. Also not checkpointed, for the same reason as activeDialogue —
   * see restartFromCheckpoint. */
  activeChallengeId: string | null;
  /** Ids of successfully resolved ChallengeDefs — persisted so a room-scoped
   * challenge doesn't re-trigger every time she walks back in. */
  resolvedChallenges: string[];
  checkpoint: Checkpoint;
  ended: boolean;
}

export function findScene(episode: EpisodeDef, sceneId: string): SceneDef {
  const scene = episode.scenes.find((s) => s.id === sceneId);
  if (!scene) throw new Error(`Unknown scene: ${sceneId}`);
  return scene;
}

export function findRoom(episode: EpisodeDef, roomId: string): { room: RoomDef; scene: SceneDef } {
  for (const scene of episode.scenes) {
    const room = scene.rooms.find((r) => r.id === roomId);
    if (room) return { room, scene };
  }
  throw new Error(`Unknown room: ${roomId}`);
}

export function findItem(episode: EpisodeDef, itemId: string): ItemDef {
  const item = episode.items.find((i) => i.id === itemId);
  if (!item) throw new Error(`Unknown item: ${itemId}`);
  return item;
}

function seedNpcState(campaign: Campaign): Record<string, NpcRuntimeState> {
  return Object.fromEntries(
    Object.values(campaign.npcs).map((npc) => [npc.id, { trust: npc.trust, honesty: npc.honesty }]),
  );
}

export function createInitialState(
  profile: PlayerProfile,
  initialFlags: StoryFlags,
  episode: EpisodeDef,
  campaign: Campaign,
): GameState {
  const startScene = findScene(episode, episode.startSceneId);
  const flags = { ...initialFlags };
  const npcState = seedNpcState(campaign);
  return {
    version: 1,
    player: profile,
    flags,
    inventory: [],
    currentSceneId: startScene.id,
    currentRoomId: startScene.startRoomId,
    openState: {},
    npcState,
    decisions: {},
    party: [],
    activeDialogue: null,
    activeChallengeId: null,
    resolvedChallenges: [],
    checkpoint: {
      sceneId: startScene.id,
      roomId: startScene.startRoomId,
      inventory: [],
      flags: { ...flags },
      openState: {},
      npcState: { ...npcState },
      decisions: {},
      party: [],
      resolvedChallenges: [],
    },
    ended: false,
  };
}

export function restartFromCheckpoint(state: GameState): GameState {
  return {
    ...state,
    flags: { ...state.checkpoint.flags },
    inventory: [...state.checkpoint.inventory],
    currentSceneId: state.checkpoint.sceneId,
    currentRoomId: state.checkpoint.roomId,
    openState: { ...state.checkpoint.openState },
    npcState: { ...state.checkpoint.npcState },
    decisions: { ...state.checkpoint.decisions },
    party: [...state.checkpoint.party],
    resolvedChallenges: [...state.checkpoint.resolvedChallenges],
    activeDialogue: null,
    activeChallengeId: null,
    ended: false,
  };
}
