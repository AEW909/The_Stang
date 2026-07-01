import { describe, expect, it } from "vitest";
import { campaign } from "../data/campaign";
import { episode1 } from "../data/episodes/episode1";
import { createInitialState } from "./state";
import { createBaseStats, createPlayerProfile } from "./heroCreator";
import { processCommand } from "./commands";
import { clearSave, loadGame, saveGame, SAVE_KEY, type StorageLike } from "./save";

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  };
}

describe("save/load", () => {
  it("round-trips a fresh game state", () => {
    const storage = createMemoryStorage();
    const stats = createBaseStats(campaign.statNames, campaign.pointBuy);
    const profile = createPlayerProfile("Harper", stats);
    const state = createInitialState(profile, campaign.initialFlags, episode1);

    saveGame(state, storage);
    const loaded = loadGame(storage);

    expect(loaded).toEqual(state);
  });

  it("preserves progress — location, inventory, and stats — after a save/load cycle", () => {
    const storage = createMemoryStorage();
    const stats = createBaseStats(campaign.statNames, campaign.pointBuy);
    stats.bravery = 8;
    const profile = createPlayerProfile("Harper", stats);
    let state = createInitialState(profile, campaign.initialFlags, episode1);
    state = processCommand(state, campaign, episode1, "take key").state;
    state = processCommand(state, campaign, episode1, "use key on door").state;

    saveGame(state, storage);
    const loaded = loadGame(storage);

    expect(loaded?.currentRoomId).toBe("corridor_1");
    expect(loaded?.inventory).toContain("spare_key");
    expect(loaded?.player.stats.bravery).toBe(8);
  });

  it("returns null when there is no save", () => {
    const storage = createMemoryStorage();
    expect(loadGame(storage)).toBeNull();
  });

  it("returns null instead of throwing on corrupted save data", () => {
    const storage = createMemoryStorage();
    storage.setItem(SAVE_KEY, "{not valid json");
    expect(loadGame(storage)).toBeNull();
  });

  it("clearSave removes the save", () => {
    const storage = createMemoryStorage();
    const stats = createBaseStats(campaign.statNames, campaign.pointBuy);
    const profile = createPlayerProfile("Harper", stats);
    const state = createInitialState(profile, campaign.initialFlags, episode1);
    saveGame(state, storage);
    clearSave(storage);
    expect(loadGame(storage)).toBeNull();
  });
});
