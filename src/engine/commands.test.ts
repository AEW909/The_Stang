import { describe, expect, it } from "vitest";
import { campaign } from "../data/campaign";
import { episode1 } from "../data/episodes/episode1";
import { createInitialState, restartFromCheckpoint } from "./state";
import { createBaseStats, createPlayerProfile } from "./heroCreator";
import { processCommand } from "./commands";
import type { GameState } from "./state";

function newGame(): GameState {
  const stats = createBaseStats(campaign.statNames, campaign.pointBuy);
  const profile = createPlayerProfile("Harper", stats);
  return createInitialState(profile, campaign.initialFlags, episode1, campaign);
}

function run(state: GameState, ...commands: string[]): GameState {
  let next = state;
  for (const c of commands) {
    next = processCommand(next, campaign, episode1, c).state;
  }
  return next;
}

function look(state: GameState): string {
  return processCommand(state, campaign, episode1, "look").output.join(" ");
}

/** classroom -> corridor_1, key found (drawer opened) and door unlocked, extinguisher not yet taken. */
function inCorridor1(): GameState {
  return run(newGame(), "open drawer", "take key", "use key on door");
}

/** classroom -> corridor_2, right before the caretaker encounter, key held. */
function atCaretaker(): GameState {
  return run(inCorridor1(), "go forward");
}

describe("Episode 1 — deterministic room descriptions", () => {
  it("lists visible props in a 'You can also see' line, excluding hidden contained items", () => {
    const text = look(newGame());
    expect(text).toMatch(/You can also see:/);
    expect(text).toMatch(/TEACHER'S DESK/);
    expect(text).toMatch(/WINDOW/);
    expect(text).toMatch(/POSTER/);
    expect(text).toMatch(/HAMSTER CAGE/);
    expect(text).not.toMatch(/BRASS KEY/);
  });

  it("shows the closed-drawer fragment before opening it, and the open one after", () => {
    const before = look(newGame());
    expect(before).toMatch(/doesn't look properly shut/);

    const afterOpen = run(newGame(), "open drawer");
    expect(look(afterOpen)).toMatch(/hangs open, something glinting inside/);
    expect(look(afterOpen)).toMatch(/BRASS KEY/);
  });

  it("drops an item from the list once it's taken, without needing separate 'taken' bookkeeping", () => {
    const withKey = run(newGame(), "open drawer", "take key");
    expect(look(withKey)).not.toMatch(/BRASS KEY/);
    expect(withKey.inventory).toContain("spare_key");
  });

  it("keeps permanent scenery in the list even once every takeable item is gone", () => {
    const cleared = run(inCorridor1(), "open lost property", "take sandwich", "take extinguisher");
    const text = look(cleared);
    // Nothing takeable left, but the room still has non-takeable fixtures.
    expect(text).toMatch(/NOTICE BOARD/);
    expect(text).toMatch(/LOCKERS/);
    expect(text).not.toMatch(/HALF-EATEN SANDWICH/);
    expect(text).not.toMatch(/FIRE EXTINGUISHER/);
  });

  it("excludes NPCs and plot-critical objects (caretaker, note) from the auto-list entirely", () => {
    const text = look(atCaretaker());
    // The caretaker and the supply closet are both excludeFromList — with nothing else
    // in the room, the footer line should be omitted rather than printed empty.
    expect(text).toMatch(/CARETAKER/); // still described in authored prose
    expect(text).not.toMatch(/You can also see/i);
  });
});

describe("Episode 1 — open/close verbs", () => {
  it("can't take or examine a contained item before its container is opened", () => {
    const takeResult = processCommand(newGame(), campaign, episode1, "take key");
    expect(takeResult.output.join(" ")).toMatch(/don't see/i);

    const examineResult = processCommand(newGame(), campaign, episode1, "examine key");
    expect(examineResult.output.join(" ")).toMatch(/don't see/i);
  });

  it("reports already-open and already-closed states gracefully", () => {
    const opened = run(newGame(), "open drawer");
    const reopened = processCommand(opened, campaign, episode1, "open drawer");
    expect(reopened.output.join(" ")).toMatch(/already open/i);

    const closed = run(opened, "close drawer");
    const reclosed = processCommand(closed, campaign, episode1, "close drawer");
    expect(reclosed.output.join(" ")).toMatch(/already closed/i);
  });

  it("re-hides a contained item once its container is closed again", () => {
    const opened = run(newGame(), "open drawer");
    expect(look(opened)).toMatch(/BRASS KEY/);

    const closed = run(opened, "close drawer");
    expect(look(closed)).not.toMatch(/BRASS KEY/);
    const takeResult = processCommand(closed, campaign, episode1, "take key");
    expect(takeResult.output.join(" ")).toMatch(/don't see/i);
  });

  it("refuses to open or close things that aren't containers", () => {
    const openResult = processCommand(newGame(), campaign, episode1, "open desk");
    expect(openResult.output.join(" ")).toMatch(/can't open/i);

    const closeResult = processCommand(newGame(), campaign, episode1, "close desk");
    expect(closeResult.output.join(" ")).toMatch(/can't close/i);
  });

  it("gives a graceful message when opening something that isn't there", () => {
    const result = processCommand(newGame(), campaign, episode1, "open cupboard");
    expect(result.output.join(" ")).toMatch(/don't see/i);
  });
});

describe("Episode 1 — locked classroom puzzle", () => {
  it("keeps the door locked until the key is found and used", () => {
    const state = newGame();
    const blocked = processCommand(state, campaign, episode1, "go door");
    expect(blocked.output.join(" ")).toMatch(/locked/i);
    expect(blocked.state.currentRoomId).toBe("classroom");
  });

  it("lets the player open the drawer, take the key, and unlock the door", () => {
    const afterOpen = processCommand(newGame(), campaign, episode1, "open drawer");
    expect(afterOpen.output.join(" ")).toMatch(/glints inside/i);

    const afterTake = processCommand(afterOpen.state, campaign, episode1, "take key");
    expect(afterTake.state.inventory).toContain("spare_key");

    const afterUse = processCommand(afterTake.state, campaign, episode1, "use key on door");
    expect(afterUse.state.currentRoomId).toBe("corridor_1");
  });

  it("also auto-unlocks the door via a bare 'go door' once the key is held", () => {
    const afterTake = run(newGame(), "open drawer", "take key");
    const afterGo = processCommand(afterTake, campaign, episode1, "go door");
    expect(afterGo.state.currentRoomId).toBe("corridor_1");
  });

  it("essential item shows a wrong-use message when used on the wrong target", () => {
    const afterTake = run(newGame(), "open drawer", "take key");
    const result = processCommand(afterTake, campaign, episode1, "use key on window");
    expect(result.output.join(" ")).toMatch(/doesn't fit/i);
    expect(result.state.currentRoomId).toBe("classroom");
  });
});

describe("Episode 1 — flavour item contract", () => {
  it("gives an authored outcome for the fire extinguisher in the caretaker scene, evading him", () => {
    const state = run(inCorridor1(), "take extinguisher", "go forward");
    expect(state.currentRoomId).toBe("corridor_2");

    const used = processCommand(state, campaign, episode1, "use fire extinguisher");
    expect(used.output.join(" ")).toMatch(/roar/i);
    expect(used.state.flags.caretakerEvaded).toBe(true);
    expect(used.state.currentRoomId).toBe("corridor_3");
  });

  it("gives a different authored outcome for the same item back in scene 1", () => {
    const state = run(inCorridor1(), "take extinguisher");
    const used = processCommand(state, campaign, episode1, "use extinguisher");
    expect(used.output.join(" ")).toMatch(/skitters for cover/i);
  });

  it("falls back gracefully for a flavour item with no authored outcome anywhere", () => {
    const state = run(inCorridor1(), "open lost property", "take sandwich");
    const used = processCommand(state, campaign, episode1, "use sandwich");
    expect(used.output.join(" ")).toMatch(/reconsider/i);
    expect(used.output.join(" ")).not.toMatch(/error|undefined|NaN/i);
  });

  it("falls back gracefully for the extinguisher once outside its authored scenes", () => {
    // Evade via the closet here (not the extinguisher) so it's still in inventory to test with.
    const state = run(
      inCorridor1(),
      "take extinguisher",
      "go forward",
      "go closet",
      "go forward",
      "use button",
      "go forward",
      "run forward",
    );
    // Now in high_street_room, an unauthored scene for this item.
    expect(state.currentRoomId).toBe("high_street_room");
    expect(state.inventory).toContain("fire_extinguisher");
    const used = processCommand(state, campaign, episode1, "use extinguisher");
    expect(used.output.join(" ")).toMatch(/fire drill/i);
  });

  it("consumes the fire extinguisher once it's used on the caretaker", () => {
    const state = run(inCorridor1(), "take extinguisher", "go forward");
    expect(state.inventory).toContain("fire_extinguisher");
    const used = processCommand(state, campaign, episode1, "use fire extinguisher");
    expect(used.state.inventory).not.toContain("fire_extinguisher");
  });
});

describe("Episode 1 — caretaker evasion", () => {
  it("fails recoverably when trying to just bolt past him, without moving the checkpoint", () => {
    const state = atCaretaker();
    const failed = processCommand(state, campaign, episode1, "go forward");
    expect(failed.state.currentRoomId).toBe("corridor_2");
    expect(failed.state.flags.caretakerEvaded).toBe(false);
    expect(failed.output.join(" ")).toMatch(/wrench free/i);
  });

  it("can be retried after a failure — it is not an unrecoverable dead end", () => {
    const state = atCaretaker();
    const failed = processCommand(state, campaign, episode1, "go forward").state;
    const retried = processCommand(failed, campaign, episode1, "go closet");
    expect(retried.state.flags.caretakerEvaded).toBe(true);
    expect(retried.state.currentRoomId).toBe("corridor_3");
  });

  it("succeeds via the pure command-based method (hiding in the closet), with real narration for his fate", () => {
    const result = processCommand(atCaretaker(), campaign, episode1, "go closet");
    expect(result.state.flags.caretakerEvaded).toBe(true);
    expect(result.state.currentRoomId).toBe("corridor_3");
    // He shouldn't just silently vanish — the closet method needs its own success text.
    expect(result.output.join(" ")).toMatch(/shuffle past/i);
  });

  it("succeeds via the item-based method (the fire extinguisher)", () => {
    const withExtinguisher = run(inCorridor1(), "take extinguisher", "go forward");
    const result = processCommand(withExtinguisher, campaign, episode1, "use fire extinguisher");
    expect(result.state.flags.caretakerEvaded).toBe(true);
    expect(result.state.currentRoomId).toBe("corridor_3");
  });

  it("succeeds via a stat-gated push when Fight clears the threshold", () => {
    const profile = createPlayerProfile("Harper", { ...createBaseStats(campaign.statNames, campaign.pointBuy), fight: 7 });
    const state = createInitialState(profile, campaign.initialFlags, episode1, campaign);
    const result = processCommand(run(state, "open drawer", "take key", "use key on door", "go forward"), campaign, episode1, "go push");
    expect(result.state.flags.caretakerEvaded).toBe(true);
    expect(result.state.currentRoomId).toBe("corridor_3");
    expect(result.output.join(" ")).toMatch(/shoulder-check/i);
  });

  it("fails a stat-gated push when Fight doesn't clear the threshold, recoverably", () => {
    const result = processCommand(atCaretaker(), campaign, episode1, "go push");
    expect(result.state.flags.caretakerEvaded).toBe(false);
    expect(result.state.currentRoomId).toBe("corridor_2");
    expect(result.output.join(" ")).toMatch(/stronger than he looks/i);
  });

  it("succeeds via a stat-gated dodge when Flight clears the threshold", () => {
    const profile = createPlayerProfile("Harper", { ...createBaseStats(campaign.statNames, campaign.pointBuy), flight: 7 });
    const state = createInitialState(profile, campaign.initialFlags, episode1, campaign);
    const result = processCommand(run(state, "open drawer", "take key", "use key on door", "go forward"), campaign, episode1, "go dodge");
    expect(result.state.flags.caretakerEvaded).toBe(true);
    expect(result.output.join(" ")).toMatch(/quick as anything/i);
  });

  it("fails a stat-gated dodge when Flight doesn't clear the threshold, recoverably", () => {
    const result = processCommand(atCaretaker(), campaign, episode1, "go dodge");
    expect(result.state.flags.caretakerEvaded).toBe(false);
    expect(result.state.currentRoomId).toBe("corridor_2");
    expect(result.output.join(" ")).toMatch(/misjudge the distance/i);
  });

  it("can retreat back to the locker corridor to grab the extinguisher, then return and use it", () => {
    const retreated = processCommand(atCaretaker(), campaign, episode1, "go back");
    expect(retreated.state.currentRoomId).toBe("corridor_1");
    expect(retreated.output.join(" ")).toMatch(/back away slowly/i);

    const withExtinguisher = run(retreated.state, "take extinguisher", "go forward");
    expect(withExtinguisher.currentRoomId).toBe("corridor_2");

    const result = processCommand(withExtinguisher, campaign, episode1, "use fire extinguisher");
    expect(result.state.flags.caretakerEvaded).toBe(true);
    expect(result.state.currentRoomId).toBe("corridor_3");
  });

  it("restart after a failed evasion returns to right before the encounter, not episode start", () => {
    const state = atCaretaker(); // checkpoint was set on entering corridor_2 (scene boundary)
    const failed = processCommand(state, campaign, episode1, "go forward").state;
    const restarted = restartFromCheckpoint(failed);
    expect(restarted.currentRoomId).toBe("corridor_2");
    expect(restarted.currentSceneId).toBe("the_caretaker");
  });

  it("retreating to an earlier scene does not regress the checkpoint", () => {
    const state = atCaretaker();
    expect(state.checkpoint.roomId).toBe("corridor_2");

    const retreated = run(state, "go back");
    expect(retreated.currentRoomId).toBe("corridor_1");
    expect(retreated.currentSceneId).toBe("waking_up"); // tracks actual physical location
    expect(retreated.checkpoint.roomId).toBe("corridor_2"); // but checkpoint stays put, doesn't regress

    const failedAgain = run(retreated, "go forward", "go forward");
    expect(failedAgain.currentRoomId).toBe("corridor_2");

    const restarted = restartFromCheckpoint(failedAgain);
    expect(restarted.currentRoomId).toBe("corridor_2");
  });
});

describe("Episode 1 — checkpoints", () => {
  it("checkpoints when crossing a scene boundary, not on every room change within a scene", () => {
    const state = newGame();
    expect(state.checkpoint.roomId).toBe("classroom");

    const stillScene1 = inCorridor1();
    // corridor_1 is still part of the "waking_up" scene; checkpoint shouldn't move yet.
    expect(stillScene1.currentRoomId).toBe("corridor_1");
    expect(stillScene1.checkpoint.roomId).toBe("classroom");

    const enteredScene2 = run(stillScene1, "go forward");
    expect(enteredScene2.currentSceneId).toBe("the_caretaker");
    expect(enteredScene2.checkpoint.roomId).toBe("corridor_2");
  });

  it("restart reverts room and later progress to the last checkpoint, keeping flags as they were then", () => {
    const atCheckpoint = run(atCaretaker(), "go closet");
    // Evading crosses into "escape_school", which itself sets a new checkpoint at corridor_3
    // — restart should never undo an already-checkpointed success.
    expect(atCheckpoint.checkpoint.roomId).toBe("corridor_3");
    expect(atCheckpoint.checkpoint.flags.caretakerEvaded).toBe(true);

    const wandered = run(atCheckpoint, "go forward", "go forward");
    expect(wandered.currentRoomId).toBe("front_doors");

    const restarted = restartFromCheckpoint(wandered);
    expect(restarted.currentRoomId).toBe("corridor_3");
    expect(restarted.flags.caretakerEvaded).toBe(true);
  });

  it("restart also reverts open/closed container state to the checkpoint snapshot", () => {
    const openedDrawer = run(newGame(), "open drawer");
    expect(look(openedDrawer)).toMatch(/BRASS KEY/);

    // Still inside the "waking_up" scene, so the checkpoint (taken at episode start,
    // before the drawer was opened) hasn't moved.
    const restarted = restartFromCheckpoint(openedDrawer);
    expect(look(restarted)).not.toMatch(/BRASS KEY/);
  });
});

describe("Episode 1 — full playthrough reaches the cliffhanger", () => {
  it("walks start to finish using only documented commands", () => {
    const final = run(
      newGame(),
      "examine desk",
      "open drawer",
      "take key",
      "use key on door",
      "examine noticeboard",
      "open lost property",
      "take sandwich",
      "take extinguisher",
      "go forward",
      "go closet",
      "go forward",
      "examine sign-in book",
      "use button",
      "go forward",
      "run forward",
      "examine newsagent",
      "go forward",
      "examine swings",
      "go home",
      "examine doormat",
      "go door",
      "examine note",
    );
    expect(final.ended).toBe(true);
    expect(final.flags.camilleNoteFound).toBe(true);
    expect(final.currentRoomId).toBe("hallway");
  });

  it("shows the episode-ended message once finished, and restart still works", () => {
    const final = run(
      newGame(),
      "open drawer",
      "take key",
      "use key on door",
      "go forward",
      "go closet",
      "go forward",
      "use button",
      "go forward",
      "run forward",
      "go forward",
      "go home",
      "go door",
      "examine note",
    );
    const afterEnd = processCommand(final, campaign, episode1, "look");
    expect(afterEnd.output.join(" ")).toMatch(/ended/i);
  });
});

describe("Episode 1 — misc engine behaviour", () => {
  it("talk gives a graceful in-character response when no one is present", () => {
    const result = processCommand(newGame(), campaign, episode1, "talk");
    expect(result.output.join(" ")).toMatch(/no one here/i);
  });

  it("talk during the caretaker encounter acknowledges him without a dialogue system", () => {
    const result = processCommand(atCaretaker(), campaign, episode1, "talk caretaker");
    expect(result.output.join(" ")).toMatch(/doesn't seem like the moment/i);
  });

  it("unknown input produces a graceful message, never a crash", () => {
    const result = processCommand(newGame(), campaign, episode1, "dance wildly");
    expect(result.output.join(" ")).toMatch(/don't understand/i);
  });

  it("health reports the player's stats", () => {
    const result = processCommand(newGame(), campaign, episode1, "health");
    expect(result.output.join(" ")).toMatch(/Bravery/);
  });
});

describe("Episode 1 — natural phrasing with articles", () => {
  it("matches interactables, items, and exits when the player types 'the'/'a'/'an'", () => {
    expect(processCommand(newGame(), campaign, episode1, "examine the desk").output.join(" ")).toMatch(/Mrs Reeves/i);

    const opened = processCommand(newGame(), campaign, episode1, "open the drawer");
    expect(opened.output.join(" ")).toMatch(/glints inside/i);

    const withKey = processCommand(opened.state, campaign, episode1, "take the key");
    expect(withKey.state.inventory).toContain("spare_key");

    const unlocked = processCommand(withKey.state, campaign, episode1, "use the key on the door");
    expect(unlocked.state.currentRoomId).toBe("corridor_1");
  });

  it("a bare 'go the door' also resolves the exit correctly", () => {
    const withKey = run(newGame(), "open drawer", "take key");
    const result = processCommand(withKey, campaign, episode1, "go the door");
    expect(result.state.currentRoomId).toBe("corridor_1");
  });

  it("strips leading prepositions too, including combinations with articles", () => {
    const withKey = run(newGame(), "open drawer", "take key");
    expect(processCommand(withKey, campaign, episode1, "go through the door").state.currentRoomId).toBe("corridor_1");

    const atClosetDoor = atCaretaker();
    const result = processCommand(atClosetDoor, campaign, episode1, "go into the closet");
    expect(result.state.currentRoomId).toBe("corridor_3");
  });

  it("supports walk/run/grab and 'look at X' as natural synonyms", () => {
    expect(processCommand(newGame(), campaign, episode1, "look at the desk").output.join(" ")).toMatch(/Mrs Reeves/i);
    const opened = run(newGame(), "open drawer");
    const grabbed = processCommand(opened, campaign, episode1, "grab the key");
    expect(grabbed.state.inventory).toContain("spare_key");
    const walked = processCommand(grabbed.state, campaign, episode1, "walk through the door");
    expect(walked.state.currentRoomId).toBe("corridor_1");
  });
});

describe("Episode 1 — unlock narration only plays once", () => {
  it("shows the key's unlock line the first time, but not on later passes through the same door", () => {
    const first = processCommand(run(newGame(), "open drawer", "take key"), campaign, episode1, "go door");
    expect(first.output.join(" ")).toMatch(/satisfying clunk/i);

    const back = processCommand(first.state, campaign, episode1, "go back");
    const second = processCommand(back.state, campaign, episode1, "go door");
    expect(second.output.join(" ")).not.toMatch(/satisfying clunk/i);
    expect(second.state.currentRoomId).toBe("corridor_1");
  });

  it("still applies the item's effects on repeat passes even without the narration", () => {
    const first = run(newGame(), "open drawer", "take key", "go door");
    const back = run(first, "go back");
    const second = processCommand(back, campaign, episode1, "use key on door");
    // essentialUse.effects (goTo corridor_1) should still fire via the explicit USE path regardless.
    expect(second.state.currentRoomId).toBe("corridor_1");
  });
});

describe("Episode 1 — bare exit-alias fallback", () => {
  it("treats an unrecognised bare word as 'go <word>' when it names a current exit", () => {
    const result = processCommand(atCaretaker(), campaign, episode1, "back");
    expect(result.state.currentRoomId).toBe("corridor_1");
    expect(result.output.join(" ")).toMatch(/back away slowly/i);
  });

  it("still gives the normal unknown-command message for anything that isn't an exit", () => {
    const result = processCommand(atCaretaker(), campaign, episode1, "dance");
    expect(result.output.join(" ")).toMatch(/don't understand/i);
  });
});

describe("Episode 1 — engine contract fixes", () => {
  it("the essential item's effects fire consistently whether unlocked via USE or auto-unlocked via GO", () => {
    // Both paths should land in the same place with the same inventory/flags —
    // previously only the explicit USE path ran essentialUse.effects.
    const viaUse = run(newGame(), "open drawer", "take key", "use key on door");
    const viaGo = run(newGame(), "open drawer", "take key", "go door");
    expect(viaGo.currentRoomId).toBe(viaUse.currentRoomId);
    expect(viaGo.inventory).toEqual(viaUse.inventory);
  });

  it("the fire extinguisher's scene-1 flavour text no longer references a room-specific fixture", () => {
    // It's usable from either room in the "waking_up" scene (classroom or corridor_1),
    // so its joke text must not name something that only exists in one of them.
    const inClassroom = run(inCorridor1(), "take extinguisher", "go back");
    expect(inClassroom.currentRoomId).toBe("classroom");
    const result = processCommand(inClassroom, campaign, episode1, "use extinguisher");
    expect(result.output.join(" ")).not.toMatch(/noticeboard/i);
  });
});

/** classroom -> park_room, having evaded the caretaker via the closet. */
function atPark(): GameState {
  return run(
    inCorridor1(),
    "go forward",
    "go closet",
    "go forward",
    "use button",
    "go forward",
    "run forward",
    "go forward",
  );
}

describe("Episode 1 — the scarf and the chase home (pacing fix)", () => {
  it("taking the scarf sets chasedFromPark and narrates something moving in the trees", () => {
    const result = processCommand(atPark(), campaign, episode1, "take scarf");
    expect(result.state.flags.chasedFromPark).toBe(true);
    expect(result.state.inventory).toContain("camilles_scarf");
    expect(result.output.join(" ")).toMatch(/branch snaps/i);
  });

  it("leaving the park reads calm if the scarf was never taken", () => {
    const result = processCommand(atPark(), campaign, episode1, "go home");
    expect(result.output.join(" ")).toMatch(/falling quiet behind you/i);
    expect(result.state.currentRoomId).toBe("front_garden");
  });

  it("leaving the park reads as a chase once the scarf has been taken", () => {
    const withScarf = run(atPark(), "take scarf");
    const result = processCommand(withScarf, campaign, episode1, "go home");
    expect(result.output.join(" ")).toMatch(/chest heaving/i);
    expect(result.state.currentRoomId).toBe("front_garden");
  });

  it("the scarf has no authored USE outcome and falls back gracefully", () => {
    const withScarf = run(atPark(), "take scarf");
    const result = processCommand(withScarf, campaign, episode1, "use scarf");
    expect(result.output.join(" ")).toMatch(/it's hers/i);
  });
});

/** classroom -> reception, having evaded the caretaker via the closet. */
function atReception(): GameState {
  return run(inCorridor1(), "go forward", "go closet", "go forward");
}

describe("Episode 1 — the front doors (run-only timed exit)", () => {
  it("the doors are locked before the button is ever pressed, regardless of verb", () => {
    const state = run(atReception(), "go forward"); // reception -> front_doors
    const viaGo = processCommand(state, campaign, episode1, "go out");
    expect(viaGo.output.join(" ")).toMatch(/don't budge/i);
    const viaRun = processCommand(state, campaign, episode1, "run out");
    expect(viaRun.output.join(" ")).toMatch(/don't budge/i);
    expect(viaRun.state.flags.frontDoorsUnlocked).toBe(false);
  });

  it("USE on the button (a fixture, not an inventory item) unlocks the doors", () => {
    const result = processCommand(atReception(), campaign, episode1, "use button");
    expect(result.state.flags.frontDoorsUnlocked).toBe(true);
    expect(result.output.join(" ")).toMatch(/clunks and releases/i);
  });

  it("walking (not running) through the unlocked doors fails and relocks them", () => {
    const unlocked = run(atReception(), "use button", "go forward");
    const result = processCommand(unlocked, campaign, episode1, "go out");
    expect(result.output.join(" ")).toMatch(/not fast enough/i);
    expect(result.state.currentRoomId).toBe("front_doors");
    expect(result.state.flags.frontDoorsUnlocked).toBe(false);
  });

  it("a bare exit word (no explicit verb) does not count as running", () => {
    const unlocked = run(atReception(), "use button", "go forward");
    const result = processCommand(unlocked, campaign, episode1, "out");
    expect(result.output.join(" ")).toMatch(/not fast enough/i);
    expect(result.state.flags.frontDoorsUnlocked).toBe(false);
  });

  it("running through the unlocked doors in time succeeds", () => {
    const unlocked = run(atReception(), "use button", "go forward");
    const result = processCommand(unlocked, campaign, episode1, "run out");
    expect(result.state.currentRoomId).toBe("high_street_room");
    expect(result.output.join(" ")).toMatch(/shove through the doors/i);
  });

  it("can go back to reception and retry after relocking", () => {
    const relocked = run(atReception(), "use button", "go forward", "go out"); // wrong verb, relocks
    expect(relocked.currentRoomId).toBe("front_doors");
    const backAtReception = run(relocked, "go back");
    expect(backAtReception.currentRoomId).toBe("reception");
    const retried = run(backAtReception, "use button", "go forward", "run out");
    expect(retried.currentRoomId).toBe("high_street_room");
  });

  it("running through the door by name (not just the 'out' alias) works too", () => {
    const unlocked = run(atReception(), "use button", "go forward");
    const result = processCommand(unlocked, campaign, episode1, "run through door");
    expect(result.state.currentRoomId).toBe("high_street_room");
  });
});

describe("Episode 1 — 'push'/'press' as natural USE synonyms", () => {
  it("push button and press button both trigger the button's USE effect", () => {
    const push = processCommand(atReception(), campaign, episode1, "push button");
    expect(push.state.flags.frontDoorsUnlocked).toBe(true);
    expect(push.output.join(" ")).toMatch(/clunks and releases/i);

    const press = processCommand(atReception(), campaign, episode1, "press the button");
    expect(press.state.flags.frontDoorsUnlocked).toBe(true);
  });

  it("does not shadow 'push'/'push past' as an exit word in the caretaker encounter", () => {
    const result = processCommand(atCaretaker(), campaign, episode1, "push past");
    expect(result.output.join(" ")).toMatch(/force your way past/i); // the exit's lockedText, not a USE fallback
  });
});
