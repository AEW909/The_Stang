import { describe, expect, it } from "vitest";
import { campaign } from "../data/campaign";
import { createInitialState, restartFromCheckpoint } from "./state";
import type { GameState } from "./state";
import { createBaseStats, createPlayerProfile } from "./heroCreator";
import { processCommand } from "./commands";
import type { EpisodeDef } from "./types";

// Self-contained fixture, independent of any real episode's content.
const testEpisode: EpisodeDef = {
  id: "test_episode",
  number: 99,
  title: "Test Episode",
  prerequisites: [],
  startSceneId: "s1",
  items: [],
  dialogues: [],
  challenges: [
    {
      id: "corridor_challenge",
      roomId: "room2",
      prompt: "Something blocks your path. What do you do?",
      options: [
        {
          id: "push",
          label: "Push past (Fight)",
          requires: { stat: "fight", min: 7 },
          successText: "You shove past.",
          failureText: "You're not strong enough.",
          effects: [{ type: "goTo", roomId: "room3" }],
        },
        {
          id: "dodge",
          label: "Dart past (Flight)",
          requires: { stat: "flight", min: 7 },
          successText: "You dart past.",
          failureText: "You're not quick enough.",
          effects: [{ type: "goTo", roomId: "room3" }],
        },
        {
          id: "hide",
          label: "Hide and wait",
          successText: "You hide, then slip past once it's clear.",
          effects: [{ type: "goTo", roomId: "room3" }],
        },
      ],
    },
    {
      id: "friend_choice",
      // No roomId — only reachable via the startChallenge effect, like a
      // decision with no physical location ("who do you bring").
      prompt: "Who do you bring with you?",
      options: [
        {
          id: "bring_ellie",
          label: "Bring Ellie",
          successText: "Ellie nods and comes with you.",
          effects: [
            { type: "setDecision", key: "whoCameAlong", value: "ellie" },
            { type: "joinParty", npcId: "ellie" },
          ],
        },
        {
          id: "bring_joshua",
          label: "Bring Joshua",
          successText: "Joshua grins and comes with you.",
          effects: [
            { type: "setDecision", key: "whoCameAlong", value: "joshua" },
            { type: "joinParty", npcId: "joshua" },
          ],
        },
      ],
    },
  ],
  scenes: [
    {
      id: "s1",
      title: "Scene 1",
      startRoomId: "room1",
      rooms: [
        {
          id: "room1",
          name: "Room One",
          locationId: "harpers_house",
          description: "A plain room.",
          interactables: [
            {
              id: "noticeboard",
              name: "NOTICEBOARD",
              examineText: "A noticeboard. Who should come with you?",
              onExamineEffects: [{ type: "startChallenge", challengeId: "friend_choice" }],
            },
          ],
          exits: [{ aliases: ["forward", "e"], targetRoomId: "room2" }],
        },
        {
          id: "room2",
          name: "Room Two",
          locationId: "harpers_house",
          description: "A narrow corridor.",
          interactables: [{ id: "torch", name: "TORCH", examineText: "A dusty torch on the wall." }],
          exits: [{ aliases: ["back", "w"], targetRoomId: "room1" }],
        },
        {
          id: "room3",
          name: "Room Three",
          locationId: "harpers_house",
          description: "You made it through.",
          interactables: [],
          exits: [{ aliases: ["back", "w"], targetRoomId: "room2" }],
        },
      ],
    },
  ],
  endingText: "The end.",
};

function newGame(overrides?: Partial<Record<"bravery" | "fight" | "flight" | "smarts" | "charm", number>>): GameState {
  const stats = createBaseStats(campaign.statNames, campaign.pointBuy);
  Object.assign(stats, overrides);
  const profile = createPlayerProfile("Harper", stats);
  return createInitialState(profile, campaign.initialFlags, testEpisode, campaign);
}

function run(state: GameState, ...commands: string[]): GameState {
  let next = state;
  for (const c of commands) {
    next = processCommand(next, campaign, testEpisode, c).state;
  }
  return next;
}

describe("Challenge engine — room-scoped", () => {
  it("auto-activates when the room is entered, printing the prompt and numbered options", () => {
    const result = processCommand(newGame(), campaign, testEpisode, "forward");
    expect(result.output.join(" ")).toMatch(/Something blocks your path/i);
    expect(result.output.join(" ")).toMatch(/1\. Push past/i);
    expect(result.output.join(" ")).toMatch(/3\. Hide and wait/i);
    expect(result.state.activeChallengeId).toBe("corridor_challenge");
  });

  it("an unconditional option succeeds outright and moves her on", () => {
    const state = run(newGame(), "forward");
    const result = processCommand(state, campaign, testEpisode, "3");
    expect(result.output.join(" ")).toMatch(/hide, then slip past/i);
    expect(result.state.currentRoomId).toBe("room3");
    expect(result.state.activeChallengeId).toBeNull();
    expect(result.state.resolvedChallenges).toContain("corridor_challenge");
  });

  it("a gated option succeeds when the stat threshold is met", () => {
    const state = run(newGame({ fight: 7 }), "forward");
    const result = processCommand(state, campaign, testEpisode, "1");
    expect(result.output.join(" ")).toMatch(/shove past/i);
    expect(result.state.currentRoomId).toBe("room3");
  });

  it("a gated option fails recoverably, leaving the challenge open to retry a different option", () => {
    const state = run(newGame(), "forward"); // base stats, fight/flight both 3
    const failed = processCommand(state, campaign, testEpisode, "1");
    expect(failed.output.join(" ")).toMatch(/not strong enough/i);
    expect(failed.state.currentRoomId).toBe("room2");
    expect(failed.state.activeChallengeId).toBe("corridor_challenge");

    // Retry with a different (unconditional) option — should still work.
    const retried = processCommand(failed.state, campaign, testEpisode, "3");
    expect(retried.state.currentRoomId).toBe("room3");
  });

  it("an out-of-range pick gives a graceful message and leaves the challenge open", () => {
    const state = run(newGame(), "forward");
    const result = processCommand(state, campaign, testEpisode, "9");
    expect(result.output.join(" ")).toMatch(/not one of the options/i);
    expect(result.state.activeChallengeId).toBe("corridor_challenge");
  });

  it("'Other' isn't a menu item — any non-numeric input just falls through to the normal parser", () => {
    const state = run(newGame(), "forward");
    const result = processCommand(state, campaign, testEpisode, "examine torch");
    expect(result.output.join(" ")).toMatch(/dusty torch/i);
    // Still open afterwards — examining something doesn't consume the challenge.
    expect(result.state.activeChallengeId).toBe("corridor_challenge");
  });

  it("leaving the room without resolving cancels the challenge, and re-entering reactivates it fresh", () => {
    const state = run(newGame(), "forward");
    expect(state.activeChallengeId).toBe("corridor_challenge");

    const left = run(state, "back");
    expect(left.activeChallengeId).toBeNull();
    expect(left.resolvedChallenges).not.toContain("corridor_challenge");

    const reentered = run(left, "forward");
    expect(reentered.activeChallengeId).toBe("corridor_challenge");
  });

  it("a resolved challenge does not re-trigger on re-entry", () => {
    const solved = run(newGame(), "forward", "3", "back");
    expect(solved.currentRoomId).toBe("room2");
    expect(solved.activeChallengeId).toBeNull(); // nothing left to activate — already resolved
    const text = processCommand(solved, campaign, testEpisode, "look").output.join(" ");
    expect(text).not.toMatch(/Something blocks your path/i);
  });
});

describe("Challenge engine — roomless, effect-triggered", () => {
  it("startChallenge activates a challenge with no physical location", () => {
    const result = processCommand(newGame(), campaign, testEpisode, "examine noticeboard");
    expect(result.output.join(" ")).toMatch(/Who do you bring/i);
    expect(result.state.activeChallengeId).toBe("friend_choice");
  });

  it("picking an option applies setDecision and joinParty together", () => {
    const state = run(newGame(), "examine noticeboard");
    const result = processCommand(state, campaign, testEpisode, "2");
    expect(result.output.join(" ")).toMatch(/Joshua grins/i);
    expect(result.state.decisions.whoCameAlong).toBe("joshua");
    expect(result.state.party).toContain("joshua");
    expect(result.state.activeChallengeId).toBeNull();
    expect(result.state.resolvedChallenges).toContain("friend_choice");
  });
});

describe("Challenge engine — restart", () => {
  it("restart always clears activeChallengeId, and reverts resolvedChallenges to the checkpoint snapshot", () => {
    const solved = run(newGame(), "forward", "3");
    expect(solved.resolvedChallenges).toContain("corridor_challenge");
    expect(solved.activeChallengeId).toBeNull();

    // Single-scene fixture — the checkpoint never advanced past the start,
    // so restarting reverts resolvedChallenges to empty too.
    const restarted = restartFromCheckpoint(solved);
    expect(restarted.activeChallengeId).toBeNull();
    expect(restarted.resolvedChallenges).toEqual([]);
    expect(restarted.currentRoomId).toBe("room1");
  });
});
