import type { DialogueChoice, DialogueNode, DialogueTree, EpisodeDef } from "./types";
import type { GameState } from "./state";
import { meetsRequirement } from "./requirement";

export function findDialogueTree(episode: EpisodeDef, treeId: string): DialogueTree {
  const tree = episode.dialogues.find((d) => d.id === treeId);
  if (!tree) throw new Error(`Unknown dialogue tree: ${treeId}`);
  return tree;
}

export function findDialogueNode(tree: DialogueTree, nodeId: string): DialogueNode {
  const node = tree.nodes.find((n) => n.id === nodeId);
  if (!node) throw new Error(`Unknown dialogue node: ${nodeId} in tree ${tree.id}`);
  return node;
}

/** Choices currently offered to the player: gated choices only appear once
 * their requirement is met. Every node must keep at least one unconditional
 * choice available (see validateDialogueTree) so this list is never empty. */
export function availableChoices(state: GameState, node: DialogueNode): DialogueChoice[] {
  return node.choices.filter((c) => meetsRequirement(state, c.requires));
}

export function nodeHasUnconditionalChoice(node: DialogueNode): boolean {
  return node.choices.some((c) => !c.requires);
}

/** Engine contract: a dialogue can never be the only way through a scene, and a
 * stat/trust gate can never be the only option in a node. Run this over every
 * authored tree (see dialogue.test.ts) so a mis-authored episode is caught
 * before it can soft-lock a player mid-conversation. */
export function validateDialogueTree(tree: DialogueTree): string[] {
  const problems: string[] = [];
  for (const node of tree.nodes) {
    if (!nodeHasUnconditionalChoice(node)) {
      problems.push(`Dialogue "${tree.id}" node "${node.id}" has no unconditional (always-available) choice.`);
    }
  }
  return problems;
}
