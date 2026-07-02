import { describe, expect, it } from "vitest";
import { campaign } from "../data/campaign";
import { createInitialState, restartFromCheckpoint } from "./state";
import type { GameState } from "./state";
import { createBaseStats, createPlayerProfile } from "./heroCreator";
import { processCommand } from "./commands";
import { nodeHasUnconditionalChoice, validateDialogueTree } from "./dialogue";
import type { DialogueNode, DialogueTree, EpisodeDef } from "./types";

// Self-contained fixture — engine-level dialogue mechanics shouldn't depend on
// real episode content. Uses the real campaign roster (Ellie) so trust/honesty
// seeding is exercised against actual data.
const testEpisode: EpisodeDef = {
  id: "test_episode",
  number: 99,
  title: "Test Episode",
  prerequisites: [],
  startSceneId: "s1",
  items: [],
  challenges: [],
  dialogues: [
    {
      id: "ellie_intro",
      npcId: "ellie",
      sceneId: "s1",
      startNodeId: "n1",
      nodes: [
        {
          id: "n1",
          npcLine: "Are you okay? You look freaked out.",
          choices: [
            {
              id: "c1",
              label: "Tell her everything that happened.",
              npcResponse: "She listens closely, and believes you.",
              effects: [{ type: "adjustTrust", npcId: "ellie", delta: 10 }],
            },
            {
              id: "c2",
              label: "Say you're fine, just tired.",
              npcResponse: "She doesn't look convinced.",
              nextNodeId: "n2",
            },
            {
              id: "c3",
              label: "(Charm) Smoothly change the subject.",
              npcResponse: "She laughs despite herself and drops it.",
              requires: { stat: "charm", min: 8 },
              effects: [{ type: "adjustTrust", npcId: "ellie", delta: 5 }],
            },
            {
              id: "c4",
              label: "(Trusted) Ask her to keep a secret.",
              npcResponse: "\"Of course,\" she says immediately.",
              requires: { npcId: "ellie", minTrust: 90 },
              effects: [{ type: "setDecision", key: "ellieKnowsSecret", value: "true" }],
            },
          ],
        },
        {
          id: "n2",
          npcLine: "You sure? You can tell me anything.",
          choices: [
            {
              id: "c5",
              label: "Ask her to come exploring with you.",
              npcResponse: "\"Okay, I'm in,\" she says.",
              effects: [{ type: "joinParty", npcId: "ellie" }],
            },
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
          name: "Test Room",
          locationId: "harpers_house",
          description: "A plain room.",
          interactables: [
            { id: "ellie", name: "ELLIE", examineText: "Ellie.", excludeFromList: true },
            { id: "joshua", name: "JOSHUA", examineText: "Joshua.", excludeFromList: true },
          ],
          exits: [],
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

describe("Dialogue engine", () => {
  it("seeds live npcState from the campaign roster's starting trust/honesty", () => {
    const state = newGame();
    expect(state.npcState.ellie).toEqual({ trust: 75, honesty: 75 });
  });

  it("talk starts a dialogue tree and lists only unconditional choices by default", () => {
    const result = processCommand(newGame(), campaign, testEpisode, "talk ellie");
    const text = result.output.join(" ");
    expect(text).toMatch(/Are you okay/);
    expect(text).toMatch(/1\. Tell her everything/);
    expect(text).toMatch(/2\. Say you're fine/);
    // Gated choices (charm 8, trust 90) shouldn't appear — base stats/trust don't clear them.
    expect(text).not.toMatch(/Smoothly change the subject/);
    expect(text).not.toMatch(/keep a secret/);
    expect(result.state.activeDialogue).toEqual({ treeId: "ellie_intro", nodeId: "n1" });
  });

  it("reveals a stat-gated choice once Harper's stat clears the threshold", () => {
    const state = newGame({ charm: 8 });
    const result = processCommand(state, campaign, testEpisode, "talk ellie");
    expect(result.output.join(" ")).toMatch(/Smoothly change the subject/);
  });

  it("reveals a trust-gated choice once the NPC's live trust clears the threshold", () => {
    // Choice 1 grants +10 trust each time; re-enter the conversation twice to
    // clear the minTrust: 90 gate starting from Ellie's base 75.
    const afterTwoBoosts = run(newGame(), "talk ellie", "1", "talk ellie", "1");
    expect(afterTwoBoosts.npcState.ellie.trust).toBe(95);

    const reopened = processCommand(afterTwoBoosts, campaign, testEpisode, "talk ellie");
    expect(reopened.output.join(" ")).toMatch(/keep a secret/);
  });

  it("picking a numbered choice applies its effects and prints the NPC's response", () => {
    const started = run(newGame(), "talk ellie");
    const result = processCommand(started, campaign, testEpisode, "1");
    expect(result.output.join(" ")).toMatch(/believes you/);
    expect(result.state.npcState.ellie.trust).toBe(85);
    // Choice 1 has no nextNodeId — conversation ends.
    expect(result.state.activeDialogue).toBeNull();
  });

  it("continues to the next node when a choice has a nextNodeId, and ending it via joinParty works", () => {
    const afterFirstChoice = processCommand(run(newGame(), "talk ellie"), campaign, testEpisode, "2");
    expect(afterFirstChoice.output.join(" ")).toMatch(/You sure/);
    expect(afterFirstChoice.state.activeDialogue).toEqual({ treeId: "ellie_intro", nodeId: "n2" });
    expect(afterFirstChoice.state.party).not.toContain("ellie");

    const afterSecondChoice = processCommand(afterFirstChoice.state, campaign, testEpisode, "1");
    expect(afterSecondChoice.output.join(" ")).toMatch(/I'm in/);
    expect(afterSecondChoice.state.party).toContain("ellie");
    expect(afterSecondChoice.state.activeDialogue).toBeNull();
  });

  it("clamps trust at 100 rather than overflowing", () => {
    // Three +10 boosts from a base of 75 would reach 105 uncapped; must clamp to 100.
    const boosted = run(newGame(), "talk ellie", "1", "talk ellie", "1", "talk ellie", "1");
    expect(boosted.npcState.ellie.trust).toBe(100);
  });

  it("routes numeric input to dialogue choices instead of the normal parser while active", () => {
    const state = run(newGame(), "talk ellie");
    const result = processCommand(state, campaign, testEpisode, "look");
    // "look" isn't a valid choice number, so it's rejected rather than treated as the LOOK verb.
    expect(result.output.join(" ")).toMatch(/type the number/i);
    expect(result.state.activeDialogue).not.toBeNull();
  });

  it("keeps help and restart available as safety valves mid-conversation", () => {
    const state = run(newGame(), "talk ellie");
    const helpResult = processCommand(state, campaign, testEpisode, "help");
    expect(helpResult.output.join(" ")).toMatch(/middle of a conversation/i);
    expect(helpResult.state.activeDialogue).not.toBeNull();

    const restartResult = processCommand(state, campaign, testEpisode, "restart");
    expect(restartResult.state.activeDialogue).toBeNull();
  });

  it("falls back to the generic not-the-moment line when an NPC has no tree for the scene", () => {
    // Joshua is present in the room but has no authored dialogue tree for this scene.
    const result = processCommand(newGame(), campaign, testEpisode, "talk joshua");
    expect(result.output.join(" ")).toMatch(/doesn't seem like the moment/i);
    expect(result.state.activeDialogue).toBeNull();
  });

  it("checkpoints and restores npcState, decisions, and party across a scene boundary", () => {
    const withProgress = run(newGame(), "talk ellie", "2", "1"); // +joinParty ellie via node chain
    expect(withProgress.party).toContain("ellie");
    // Still scene s1 (no second scene in this fixture) — checkpoint stays at start,
    // so restarting should drop the party/trust progress made after it.
    const restarted = restartFromCheckpoint(withProgress);
    expect(restarted.party).not.toContain("ellie");
    expect(restarted.npcState.ellie.trust).toBe(75);
  });
});

describe("Dialogue authoring contract: no dead ends", () => {
  it("flags a node whose only choices are gated", () => {
    const badNode: DialogueNode = {
      id: "bad",
      npcLine: "...",
      choices: [{ id: "only", label: "(Charm) ...", npcResponse: "...", requires: { stat: "charm", min: 8 } }],
    };
    expect(nodeHasUnconditionalChoice(badNode)).toBe(false);

    const badTree: DialogueTree = { id: "bad_tree", npcId: "ellie", sceneId: "s1", startNodeId: "bad", nodes: [badNode] };
    expect(validateDialogueTree(badTree)).toEqual([
      'Dialogue "bad_tree" node "bad" has no unconditional (always-available) choice.',
    ]);
  });

  it("passes every node in the real test fixture and in Episode 1 (which has none)", () => {
    for (const tree of testEpisode.dialogues) {
      expect(validateDialogueTree(tree)).toEqual([]);
    }
  });
});
