import type { EpisodeDef, ItemDef, RoomDef, SceneDef, StatBlock, StoryFlags } from "./types";

export interface PlayerProfile {
  name: string;
  stats: StatBlock;
}

export interface Checkpoint {
  sceneId: string;
  roomId: string;
  inventory: string[];
  flags: StoryFlags;
}

export interface GameState {
  version: 1;
  player: PlayerProfile;
  flags: StoryFlags;
  inventory: string[];
  currentSceneId: string;
  currentRoomId: string;
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

export function createInitialState(
  profile: PlayerProfile,
  initialFlags: StoryFlags,
  episode: EpisodeDef,
): GameState {
  const startScene = findScene(episode, episode.startSceneId);
  const flags = { ...initialFlags };
  return {
    version: 1,
    player: profile,
    flags,
    inventory: [],
    currentSceneId: startScene.id,
    currentRoomId: startScene.startRoomId,
    checkpoint: {
      sceneId: startScene.id,
      roomId: startScene.startRoomId,
      inventory: [],
      flags: { ...flags },
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
    ended: false,
  };
}
