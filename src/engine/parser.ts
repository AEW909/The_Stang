// Tokenizes raw player input into a structured command. Vocabulary is
// intentionally fixed and small — see docs/SLICE1_HANDOFF.md Conventions.

export type ParsedCommand =
  // `running` is true only when the player literally typed "run" — "walk" is
  // a plain synonym for "go" and always false. Some exits (timed dashes)
  // only succeed if the player specifically ran; this field is always
  // present (never optional) so that distinction can't be silently dropped.
  | { verb: "go"; target: string; running: boolean }
  | { verb: "look" }
  | { verb: "examine"; target: string }
  | { verb: "inventory" }
  | { verb: "take"; target: string }
  | { verb: "drop"; target: string }
  | { verb: "use"; target: string; secondTarget?: string }
  | { verb: "open"; target: string }
  | { verb: "close"; target: string }
  | { verb: "talk"; target?: string }
  | { verb: "health" }
  | { verb: "map" }
  | { verb: "restart" }
  | { verb: "help" }
  | { verb: "empty" }
  | { verb: "unknown"; raw: string };

const DIRECTIONS = new Set(["n", "s", "e", "w"]);

const VERB_ALIASES: Record<string, string> = {
  go: "go",
  n: "go",
  s: "go",
  e: "go",
  w: "go",
  walk: "go",
  run: "go",
  look: "look",
  l: "look",
  examine: "examine",
  x: "examine",
  inventory: "inventory",
  i: "inventory",
  take: "take",
  get: "take",
  grab: "take",
  drop: "drop",
  use: "use",
  open: "open",
  close: "close",
  shut: "close",
  talk: "talk",
  health: "health",
  stats: "health",
  map: "map",
  restart: "restart",
  help: "help",
  "?": "help",
};

export function parseCommand(raw: string): ParsedCommand {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return { verb: "empty" };

  const tokens = trimmed.split(/\s+/);
  const first = tokens[0];

  if (DIRECTIONS.has(first) && tokens.length === 1) {
    return { verb: "go", target: first, running: false };
  }

  const canonicalVerb = VERB_ALIASES[first];
  if (!canonicalVerb) return { verb: "unknown", raw: trimmed };

  const rest = tokens.slice(1).join(" ").trim();

  switch (canonicalVerb) {
    case "go":
      return rest ? { verb: "go", target: rest, running: first === "run" } : { verb: "unknown", raw: trimmed };
    case "look": {
      // "look" alone describes the room; "look at X" / "look X" is a synonym for "examine X".
      if (!rest) return { verb: "look" };
      const target = rest.startsWith("at ") ? rest.slice(3).trim() : rest;
      return target ? { verb: "examine", target } : { verb: "look" };
    }
    case "examine":
      return rest ? { verb: "examine", target: rest } : { verb: "unknown", raw: trimmed };
    case "inventory":
      return { verb: "inventory" };
    case "take":
      return rest ? { verb: "take", target: rest } : { verb: "unknown", raw: trimmed };
    case "drop":
      return rest ? { verb: "drop", target: rest } : { verb: "unknown", raw: trimmed };
    case "use": {
      if (!rest) return { verb: "unknown", raw: trimmed };
      const onSplit = rest.split(/\s+on\s+/);
      return { verb: "use", target: onSplit[0], secondTarget: onSplit[1] };
    }
    case "open":
      return rest ? { verb: "open", target: rest } : { verb: "unknown", raw: trimmed };
    case "close":
      return rest ? { verb: "close", target: rest } : { verb: "unknown", raw: trimmed };
    case "talk":
      return { verb: "talk", target: rest || undefined };
    case "health":
      return { verb: "health" };
    case "map":
      return { verb: "map" };
    case "restart":
      return { verb: "restart" };
    case "help":
      return { verb: "help" };
    default:
      return { verb: "unknown", raw: trimmed };
  }
}
