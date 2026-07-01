import type { GameState } from "./state";

export const SAVE_KEY = "the_stang_save_v1";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function saveGame(state: GameState, storage: StorageLike = localStorage): void {
  storage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadGame(storage: StorageLike = localStorage): GameState | null {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

export function clearSave(storage: StorageLike = localStorage): void {
  storage.removeItem(SAVE_KEY);
}
