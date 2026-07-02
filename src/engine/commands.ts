import type { Campaign, DialogueNode, DialogueTree, EngineEffect, EpisodeDef, ExitDef, InteractableDef, ItemDef, RoomDef } from "./types";
import { findItem, findRoom, restartFromCheckpoint, type GameState } from "./state";
import { parseCommand } from "./parser";
import { availableChoices, findDialogueNode, findDialogueTree, meetsRequirement } from "./dialogue";

export interface CommandResult {
  state: GameState;
  output: string[];
}

const HELP_TEXT = [
  "Commands you can use:",
  "  go / n / s / e / w  - move in a direction or towards a named exit",
  "  look / l            - describe where you are",
  "  examine / x <thing>  - look closely at something",
  "  inventory / i        - list what you're carrying",
  "  take <thing>         - pick something up",
  "  drop <thing>         - put something down",
  "  use <thing> [on <target>] - use an item",
  "  open <thing>         - open a container",
  "  close <thing>        - close a container",
  "  talk <someone>       - try to talk to someone",
  "  health               - check your stats",
  "  map                  - see where you can go from here",
  "  restart              - go back to your last checkpoint",
  "  help / ?             - show this list",
].join("\n");

/** Words a young player will naturally include but that carry no matching
 * meaning of their own ("go into the closet", "walk to the door", "take the
 * key"). Strips them one at a time from the front so combinations like "into
 * the closet" reduce all the way to "closet". Always leaves at least one word,
 * so a target that's *only* filler words still fails to match rather than
 * silently matching everything. Costs nothing: no interactable/item/exit
 * alias in this game starts with one of these words. */
const LEADING_FILLER_WORDS = new Set(["the", "a", "an", "into", "through", "to", "towards"]);

function stripLeadingFillers(s: string): string {
  const tokens = s.split(/\s+/);
  while (tokens.length > 1 && LEADING_FILLER_WORDS.has(tokens[0])) {
    tokens.shift();
  }
  return tokens.join(" ");
}

function normalize(s: string): string {
  return stripLeadingFillers(s.trim().toLowerCase());
}

function matchesName(name: string, id: string, input: string): boolean {
  const n = normalize(name);
  const target = normalize(input);
  return id === target || n === target || n.includes(target) || target.includes(n);
}

function matchesToken(token: string, input: string): boolean {
  const a = normalize(token);
  const b = normalize(input);
  return a === b || a.includes(b) || b.includes(a);
}

/** Open/closed state is keyed by "roomId:interactableId" in GameState.openState. */
function openKey(roomId: string, interactableId: string): string {
  return `${roomId}:${interactableId}`;
}

/** Distinct namespace from openKey so an exit's "already unlocked" flag can
 * never collide with an interactable's open/closed state. */
function exitUnlockKey(roomId: string, exit: ExitDef): string {
  return `exit:${roomId}:${exit.aliases[0]}`;
}

function isOpen(state: GameState, room: RoomDef, interactable: InteractableDef): boolean {
  const key = openKey(room.id, interactable.id);
  if (key in state.openState) return state.openState[key];
  return interactable.startsOpen ?? false;
}

/** A contained interactable (e.g. a key inside a drawer) is only visible/matchable
 * while its container is open. Everything else is always visible. */
function isRevealed(state: GameState, room: RoomDef, interactable: InteractableDef): boolean {
  if (!interactable.containedIn) return true;
  const container = room.interactables.find((i) => i.id === interactable.containedIn);
  if (!container) return true;
  return isOpen(state, room, container);
}

function findInteractable(state: GameState, room: RoomDef, target: string): InteractableDef | undefined {
  return room.interactables.find((i) => isRevealed(state, room, i) && matchesName(i.name, i.id, target));
}

function findExit(room: RoomDef, target: string): ExitDef | undefined {
  const t = normalize(target);
  return room.exits.find((e) => e.aliases.includes(t));
}

function findInInventory(episode: EpisodeDef, inventory: string[], target: string): ItemDef | undefined {
  for (const id of inventory) {
    const item = findItem(episode, id);
    if (matchesName(item.name, item.id, target)) return item;
  }
  return undefined;
}

function roomHasTarget(room: RoomDef, targetId: string): boolean {
  return room.exits.some((e) => e.aliases.includes(targetId)) || room.interactables.some((i) => i.id === targetId);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function adjustNpcStat(state: GameState, npcId: string, stat: "trust" | "honesty", delta: number): GameState {
  const current = state.npcState[npcId] ?? { trust: 0, honesty: 0 };
  const updated = { ...current, [stat]: clamp(current[stat] + delta, 0, 100) };
  return { ...state, npcState: { ...state.npcState, [npcId]: updated } };
}

function applyEffects(state: GameState, episode: EpisodeDef, effects: EngineEffect[]): CommandResult {
  let next = state;
  const output: string[] = [];
  for (const effect of effects) {
    switch (effect.type) {
      case "setFlag":
        next = { ...next, flags: { ...next.flags, [effect.flag]: effect.value } };
        break;
      case "addItem":
        if (!next.inventory.includes(effect.itemId)) {
          next = { ...next, inventory: [...next.inventory, effect.itemId] };
        }
        break;
      case "removeItem":
        next = { ...next, inventory: next.inventory.filter((id) => id !== effect.itemId) };
        break;
      case "goTo":
        next = { ...next, currentRoomId: effect.roomId };
        break;
      case "endEpisode":
        next = { ...next, ended: true };
        output.push(episode.endingText);
        break;
      case "adjustTrust":
        next = adjustNpcStat(next, effect.npcId, "trust", effect.delta);
        break;
      case "adjustHonesty":
        next = adjustNpcStat(next, effect.npcId, "honesty", effect.delta);
        break;
      case "setDecision":
        next = { ...next, decisions: { ...next.decisions, [effect.key]: effect.value } };
        break;
      case "joinParty":
        if (!next.party.includes(effect.npcId)) {
          next = { ...next, party: [...next.party, effect.npcId] };
        }
        break;
      case "leaveParty":
        next = { ...next, party: next.party.filter((id) => id !== effect.npcId) };
        break;
    }
  }
  return { state: next, output };
}

function sceneIndex(episode: EpisodeDef, sceneId: string): number {
  return episode.scenes.findIndex((s) => s.id === sceneId);
}

/** Checkpoints save at the end of every scene: whenever the current room's
 * scene differs from the tracked scene, we've just crossed a scene boundary.
 * Some rooms (e.g. a retreat exit back to an earlier corridor) let the player
 * physically re-enter an earlier scene — currentSceneId always tracks the
 * room they're actually standing in (scene-scoped content like flavour item
 * outcomes depends on that being accurate), but the checkpoint itself must
 * only ever advance forward, never regress just because the player backtracked. */
function syncSceneAndCheckpoint(state: GameState, episode: EpisodeDef): GameState {
  const { scene } = findRoom(episode, state.currentRoomId);
  if (scene.id === state.currentSceneId) return state;
  const next: GameState = { ...state, currentSceneId: scene.id };

  if (sceneIndex(episode, scene.id) <= sceneIndex(episode, state.checkpoint.sceneId)) {
    return next;
  }

  return {
    ...next,
    checkpoint: {
      sceneId: scene.id,
      roomId: state.currentRoomId,
      inventory: [...state.inventory],
      flags: { ...state.flags },
      openState: { ...state.openState },
      npcState: { ...state.npcState },
      decisions: { ...state.decisions },
      party: [...state.party],
    },
  };
}

/** The deterministic room-description contract: a fixed base description,
 * plus an auto-generated "You can also see" line built from whichever
 * interactables are currently revealed and not yet taken. An interactable
 * drops out once it's taken (derived from inventory, no extra state needed)
 * or stays out until its container is opened (see isRevealed). NPCs and
 * plot-critical objects opt out via excludeFromList and stay in authored prose. */
function describeRoom(state: GameState, episode: EpisodeDef): string[] {
  const { room } = findRoom(episode, state.currentRoomId);
  const lines = [`-- ${room.name} --`, room.description];

  const footerItems = room.interactables.filter((i) => {
    if (i.excludeFromList) return false;
    if (!isRevealed(state, room, i)) return false;
    if (i.itemId && state.inventory.includes(i.itemId)) return false;
    return true;
  });

  if (footerItems.length > 0) {
    const fragments = footerItems.map((i) => {
      if (i.openable && isOpen(state, room, i) && i.openShortDescription) return i.openShortDescription;
      return i.shortDescription ?? i.name;
    });
    lines.push(`You can also see: ${fragments.join(" ")}`);
  }

  return lines;
}

/** An exit's gate conditions are mutually exclusive per exit — each one
 * represents a single method of getting through. `requires` differs from
 * `requiresFlag`/`unlocksWithItemId` in spirit (see ExitDef) but is checked
 * the same deterministic way. */
function isExitPassable(state: GameState, exit: ExitDef): boolean {
  if (exit.unlocksWithItemId) return state.inventory.includes(exit.unlocksWithItemId);
  if (exit.requiresFlag) return !!state.flags[exit.requiresFlag];
  if (exit.requires) return meetsRequirement(state, exit.requires);
  return true;
}

function moveThroughExit(state: GameState, episode: EpisodeDef, exit: ExitDef, extraOutput: string[] = []): CommandResult {
  let next: GameState = { ...state, currentRoomId: exit.targetRoomId };
  const output = [...extraOutput];
  if (exit.successText) output.push(exit.successText);
  if (exit.onSuccess) {
    const applied = applyEffects(next, episode, exit.onSuccess);
    next = applied.state;
    output.push(...applied.output);
  }
  return { state: next, output: [...output, ...describeRoom(next, episode)] };
}

function resolveGo(state: GameState, episode: EpisodeDef, target: string): CommandResult {
  const { room } = findRoom(episode, state.currentRoomId);
  const exit = findExit(room, target);
  if (!exit) return { state, output: ["You can't go that way."] };

  if (!isExitPassable(state, exit)) {
    return { state, output: [exit.lockedText ?? "That's locked."] };
  }

  if (exit.unlocksWithItemId) {
    const item = findItem(episode, exit.unlocksWithItemId);
    // Apply the item's own effects here too, not just its text — otherwise an
    // essential item's essentialUse.effects would only ever fire via the
    // explicit "use" verb, silently diverging from this auto-unlock shortcut.
    const applied = applyEffects(state, episode, item.essentialUse?.effects ?? []);

    // Only narrate the unlock once — walking back through an already-unlocked
    // door repeatedly shouldn't replay "the key turns with a satisfying clunk"
    // every single time. Reuses the openState map (any per-room boolean, not
    // just interactables) rather than adding a new piece of GameState.
    const key = exitUnlockKey(room.id, exit);
    const alreadyUnlocked = !!state.openState[key];
    let next = applied.state;
    const extra = [...applied.output];
    if (!alreadyUnlocked) {
      next = { ...next, openState: { ...next.openState, [key]: true } };
      extra.unshift(item.essentialUse?.result ?? "You unlock it and go through.");
    }

    return moveThroughExit(next, episode, exit, extra);
  }

  return moveThroughExit(state, episode, exit);
}

function resolveExamine(state: GameState, episode: EpisodeDef, target: string): CommandResult {
  const { room } = findRoom(episode, state.currentRoomId);
  const interactable = findInteractable(state, room, target);
  if (interactable) {
    const useOpenText = interactable.openable && isOpen(state, room, interactable) && interactable.openExamineText;
    const output = [useOpenText || interactable.examineText];
    let next = state;
    if (interactable.onExamineEffects) {
      const applied = applyEffects(next, episode, interactable.onExamineEffects);
      next = applied.state;
      output.push(...applied.output);
    }
    return { state: next, output };
  }
  const inventoryItem = findInInventory(episode, state.inventory, target);
  if (inventoryItem) return { state, output: [inventoryItem.description] };
  const exit = findExit(room, target);
  if (exit) {
    if (!isExitPassable(state, exit)) return { state, output: [exit.lockedText ?? "It's locked."] };
    return { state, output: ["That's the way through."] };
  }
  return { state, output: [`You don't see "${target}" here.`] };
}

function resolveTake(state: GameState, episode: EpisodeDef, target: string): CommandResult {
  const { room } = findRoom(episode, state.currentRoomId);
  const interactable = findInteractable(state, room, target);
  if (!interactable) return { state, output: [`You don't see "${target}" here.`] };
  if (!interactable.takeable || !interactable.itemId) {
    return { state, output: ["You can't take that."] };
  }
  if (state.inventory.includes(interactable.itemId)) {
    return { state, output: ["You already have that."] };
  }
  const item = findItem(episode, interactable.itemId);
  const next: GameState = { ...state, inventory: [...state.inventory, item.id] };
  return { state: next, output: [item.takeText ?? `You take the ${item.name}.`] };
}

function resolveDrop(state: GameState, episode: EpisodeDef, target: string): CommandResult {
  const item = findInInventory(episode, state.inventory, target);
  if (!item) return { state, output: ["You're not carrying that."] };
  const next: GameState = { ...state, inventory: state.inventory.filter((id) => id !== item.id) };
  return { state: next, output: [`You drop the ${item.name}.`] };
}

function resolveOpen(state: GameState, episode: EpisodeDef, target: string): CommandResult {
  const { room } = findRoom(episode, state.currentRoomId);
  const interactable = findInteractable(state, room, target);
  if (!interactable) return { state, output: [`You don't see "${target}" here.`] };
  if (!interactable.openable) return { state, output: ["You can't open that."] };
  if (isOpen(state, room, interactable)) return { state, output: ["It's already open."] };

  const key = openKey(room.id, interactable.id);
  const next: GameState = { ...state, openState: { ...state.openState, [key]: true } };
  return { state: next, output: [interactable.openText ?? `You open the ${interactable.name}.`] };
}

function resolveClose(state: GameState, episode: EpisodeDef, target: string): CommandResult {
  const { room } = findRoom(episode, state.currentRoomId);
  const interactable = findInteractable(state, room, target);
  if (!interactable) return { state, output: [`You don't see "${target}" here.`] };
  if (!interactable.openable) return { state, output: ["You can't close that."] };
  if (!isOpen(state, room, interactable)) return { state, output: ["It's already closed."] };

  const key = openKey(room.id, interactable.id);
  const next: GameState = { ...state, openState: { ...state.openState, [key]: false } };
  return { state: next, output: [interactable.closeText ?? `You close the ${interactable.name}.`] };
}

function resolveUse(state: GameState, episode: EpisodeDef, targetRaw: string, secondTargetRaw: string | undefined): CommandResult {
  const item = findInInventory(episode, state.inventory, targetRaw);
  if (!item) return { state, output: [`You don't have "${targetRaw}" to use.`] };
  const { room, scene } = findRoom(episode, state.currentRoomId);

  if (item.tag === "essential") {
    const use = item.essentialUse;
    if (!use) return { state, output: [item.wrongUseText ?? "Nothing happens."] };
    const targetMatches = secondTargetRaw
      ? matchesToken(use.targetId, secondTargetRaw)
      : roomHasTarget(room, use.targetId);
    if (!targetMatches) return { state, output: [item.wrongUseText ?? "Nothing happens."] };
    const applied = applyEffects(state, episode, use.effects ?? []);
    return { state: applied.state, output: [use.result, ...applied.output] };
  }

  const outcome = item.flavourUses?.find(
    (o) => o.sceneId === scene.id && (!o.targetId || (secondTargetRaw && matchesToken(o.targetId, secondTargetRaw))),
  );
  if (outcome) {
    const applied = applyEffects(state, episode, outcome.effects ?? []);
    return { state: applied.state, output: [outcome.result, ...applied.output] };
  }
  return { state, output: [item.fallbackUseText ?? "Nothing interesting happens."] };
}

function describeDialogueNode(state: GameState, node: DialogueNode): string[] {
  const lines = [node.npcLine];
  availableChoices(state, node).forEach((choice, i) => lines.push(`${i + 1}. ${choice.label}`));
  return lines;
}

function enterDialogue(state: GameState, tree: DialogueTree): CommandResult {
  const node = findDialogueNode(tree, tree.startNodeId);
  const next: GameState = { ...state, activeDialogue: { treeId: tree.id, nodeId: node.id } };
  return { state: next, output: describeDialogueNode(state, node) };
}

function resolveTalk(state: GameState, campaign: Campaign, episode: EpisodeDef, target: string | undefined): CommandResult {
  const { room, scene } = findRoom(episode, state.currentRoomId);
  const npcsPresent = room.interactables.filter((i) => campaign.npcs[i.id]);
  if (npcsPresent.length === 0) return { state, output: ["There's no one here to talk to."] };

  const npcPresent = target ? npcsPresent.find((i) => matchesName(i.name, i.id, target)) : npcsPresent[0];
  if (!npcPresent) return { state, output: ["There's no one here to talk to."] };

  const tree = episode.dialogues.find((d) => d.npcId === npcPresent.id && d.sceneId === scene.id);
  if (!tree) {
    return { state, output: [`This really doesn't seem like the moment to talk to ${npcPresent.name}.`] };
  }
  return enterDialogue(state, tree);
}

/** While a conversation is active, input is a numbered choice, not a parsed
 * command — dialogue is menu-driven by design (see docs/SLICE1_HANDOFF.md
 * Conventions). `restart` and `help` remain available as safety valves. */
function handleDialogueInput(state: GameState, episode: EpisodeDef, raw: string): CommandResult {
  const trimmed = raw.trim().toLowerCase();

  if (trimmed === "restart") {
    const next = restartFromCheckpoint(state);
    return {
      state: next,
      output: ["You come back to yourself, right where you last caught your breath.", ...describeRoom(next, episode)],
    };
  }
  if (trimmed === "help" || trimmed === "?") {
    return { state, output: ["You're in the middle of a conversation. Type the number of the option you want."] };
  }

  const activeDialogue = state.activeDialogue!;
  const tree = findDialogueTree(episode, activeDialogue.treeId);
  const node = findDialogueNode(tree, activeDialogue.nodeId);
  const choices = availableChoices(state, node);
  const index = Number.parseInt(trimmed, 10);
  const choice = Number.isInteger(index) ? choices[index - 1] : undefined;
  if (!choice) {
    return { state, output: ["Type the number of one of the choices below."] };
  }

  const applied = applyEffects(state, episode, choice.effects ?? []);
  let next = applied.state;
  const output = [choice.npcResponse, ...applied.output];

  if (choice.nextNodeId) {
    const nextNode = findDialogueNode(tree, choice.nextNodeId);
    next = { ...next, activeDialogue: { treeId: tree.id, nodeId: nextNode.id } };
    output.push(...describeDialogueNode(next, nextNode));
  } else {
    next = { ...next, activeDialogue: null };
  }

  return { state: next, output };
}

function describeInventory(state: GameState, episode: EpisodeDef): string[] {
  if (state.inventory.length === 0) return ["You aren't carrying anything."];
  const names = state.inventory.map((id) => findItem(episode, id).name);
  return [`You're carrying: ${names.join(", ")}`];
}

function describeHealth(state: GameState, campaign: Campaign): string[] {
  const lines = campaign.statNames.map((name) => {
    const label = name.charAt(0).toUpperCase() + name.slice(1);
    return `  ${label}: ${state.player.stats[name]}`;
  });
  return [`${state.player.name}'s stats:`, ...lines];
}

function describeMap(state: GameState, episode: EpisodeDef): string[] {
  const { room } = findRoom(episode, state.currentRoomId);
  if (room.exits.length === 0) return [`You are in: ${room.name}. There's nowhere else to go from here right now.`];
  const ways = room.exits.map((e) => e.aliases[0].toUpperCase()).join(", ");
  return [`You are in: ${room.name}. Ways you can go: ${ways}.`];
}

export function getSuggestions(state: GameState, episode: EpisodeDef): string[] {
  if (state.ended) return ["restart"];
  if (state.activeDialogue) {
    const tree = findDialogueTree(episode, state.activeDialogue.treeId);
    const node = findDialogueNode(tree, state.activeDialogue.nodeId);
    return availableChoices(state, node).map((choice, i) => `${i + 1}. ${choice.label}`);
  }
  const { room } = findRoom(episode, state.currentRoomId);
  const suggestions: string[] = [];
  for (const exit of room.exits) suggestions.push(`go ${exit.aliases[0]}`);
  for (const interactable of room.interactables) {
    if (!isRevealed(state, room, interactable)) continue;
    if (interactable.itemId && state.inventory.includes(interactable.itemId)) continue;
    suggestions.push(`examine ${interactable.name.toLowerCase()}`);
    if (interactable.openable) {
      suggestions.push(isOpen(state, room, interactable) ? `close ${interactable.name.toLowerCase()}` : `open ${interactable.name.toLowerCase()}`);
    }
  }
  suggestions.push("inventory", "help");
  return suggestions;
}

export function processCommand(
  state: GameState,
  campaign: Campaign,
  episode: EpisodeDef,
  raw: string,
): CommandResult {
  if (state.ended) {
    return {
      state,
      output: ["The episode has ended. Type RESTART to replay from your last checkpoint."],
    };
  }

  if (state.activeDialogue) {
    const dialogueResult = handleDialogueInput(state, episode, raw);
    const finalState = syncSceneAndCheckpoint(dialogueResult.state, episode);
    return { state: finalState, output: dialogueResult.output };
  }

  const cmd = parseCommand(raw);
  let result: CommandResult;

  switch (cmd.verb) {
    case "empty":
      result = { state, output: [] };
      break;
    case "unknown": {
      // A bare word that happens to name one of this room's exits (e.g. "push",
      // "dodge", "hide", "closet", "back") is treated as "go <word>" — those
      // words are exactly what the suggestions bar surfaces, so a player
      // shouldn't have to remember to prefix them with "go".
      const { room } = findRoom(episode, state.currentRoomId);
      result = findExit(room, cmd.raw)
        ? resolveGo(state, episode, cmd.raw)
        : { state, output: [`I don't understand "${cmd.raw}". Type HELP for the list of commands.`] };
      break;
    }
    case "help":
      result = { state, output: [HELP_TEXT] };
      break;
    case "health":
      result = { state, output: describeHealth(state, campaign) };
      break;
    case "inventory":
      result = { state, output: describeInventory(state, episode) };
      break;
    case "map":
      result = { state, output: describeMap(state, episode) };
      break;
    case "look":
      result = { state, output: describeRoom(state, episode) };
      break;
    case "restart": {
      const next = restartFromCheckpoint(state);
      result = {
        state: next,
        output: ["You come back to yourself, right where you last caught your breath.", ...describeRoom(next, episode)],
      };
      break;
    }
    case "talk":
      result = resolveTalk(state, campaign, episode, cmd.target);
      break;
    case "go":
      result = resolveGo(state, episode, cmd.target);
      break;
    case "examine":
      result = resolveExamine(state, episode, cmd.target);
      break;
    case "take":
      result = resolveTake(state, episode, cmd.target);
      break;
    case "drop":
      result = resolveDrop(state, episode, cmd.target);
      break;
    case "use":
      result = resolveUse(state, episode, cmd.target, cmd.secondTarget);
      break;
    case "open":
      result = resolveOpen(state, episode, cmd.target);
      break;
    case "close":
      result = resolveClose(state, episode, cmd.target);
      break;
  }

  const finalState = syncSceneAndCheckpoint(result.state, episode);
  return { state: finalState, output: result.output };
}
