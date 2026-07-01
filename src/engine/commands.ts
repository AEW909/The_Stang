import type { Campaign, EngineEffect, EpisodeDef, ExitDef, InteractableDef, ItemDef, RoomDef } from "./types";
import { findItem, findRoom, restartFromCheckpoint, type GameState } from "./state";
import { parseCommand } from "./parser";

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

function normalize(s: string): string {
  return s.trim().toLowerCase();
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
    }
  }
  return { state: next, output };
}

/** Checkpoints save at the end of every scene: whenever the current room's
 * scene differs from the tracked scene, we've just crossed a scene boundary. */
function syncSceneAndCheckpoint(state: GameState, episode: EpisodeDef): GameState {
  const { scene } = findRoom(episode, state.currentRoomId);
  if (scene.id === state.currentSceneId) return state;
  return {
    ...state,
    currentSceneId: scene.id,
    checkpoint: {
      sceneId: scene.id,
      roomId: state.currentRoomId,
      inventory: [...state.inventory],
      flags: { ...state.flags },
      openState: { ...state.openState },
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

function resolveGo(state: GameState, episode: EpisodeDef, target: string): CommandResult {
  const { room } = findRoom(episode, state.currentRoomId);
  const exit = findExit(room, target);
  if (!exit) return { state, output: ["You can't go that way."] };

  const passable = !exit.locked || (exit.requiresFlag && state.flags[exit.requiresFlag]);

  if (passable) {
    let next: GameState = { ...state, currentRoomId: exit.targetRoomId };
    let output: string[] = [];
    if (exit.onSuccess) {
      const applied = applyEffects(next, episode, exit.onSuccess);
      next = applied.state;
      output = applied.output;
    }
    return { state: next, output: [...output, ...describeRoom(next, episode)] };
  }

  if (exit.unlocksWithItemId && state.inventory.includes(exit.unlocksWithItemId)) {
    const item = findItem(episode, exit.unlocksWithItemId);
    const next: GameState = { ...state, currentRoomId: exit.targetRoomId };
    const unlockLine = item.essentialUse?.result ?? "You unlock it and go through.";
    return { state: next, output: [unlockLine, ...describeRoom(next, episode)] };
  }

  return { state, output: [exit.lockedText ?? "That's locked."] };
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
    const passable = !exit.locked || (exit.requiresFlag && state.flags[exit.requiresFlag]);
    if (!passable) return { state, output: [exit.lockedText ?? "It's locked."] };
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

function resolveTalk(state: GameState, campaign: Campaign, episode: EpisodeDef, target: string | undefined): CommandResult {
  const { room } = findRoom(episode, state.currentRoomId);
  const npcPresent = room.interactables.find((i) => campaign.npcs[i.id]);
  if (!npcPresent) return { state, output: ["There's no one here to talk to."] };
  if (target && !matchesName(npcPresent.name, npcPresent.id, target)) {
    return { state, output: ["There's no one here to talk to."] };
  }
  return { state, output: [`This really doesn't seem like the moment to talk to ${npcPresent.name}.`] };
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

  const cmd = parseCommand(raw);
  let result: CommandResult;

  switch (cmd.verb) {
    case "empty":
      result = { state, output: [] };
      break;
    case "unknown":
      result = { state, output: [`I don't understand "${cmd.raw}". Type HELP for the list of commands.`] };
      break;
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
