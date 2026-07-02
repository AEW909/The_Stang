import { describe, expect, it } from "vitest";
import { parseCommand } from "./parser";

describe("parseCommand", () => {
  it("parses bare directions as go commands, never running", () => {
    expect(parseCommand("n")).toEqual({ verb: "go", target: "n", running: false });
    expect(parseCommand("E")).toEqual({ verb: "go", target: "e", running: false });
  });

  it("parses go with a named target", () => {
    expect(parseCommand("go door")).toEqual({ verb: "go", target: "door", running: false });
  });

  it("parses examine and its alias", () => {
    expect(parseCommand("examine desk")).toEqual({ verb: "examine", target: "desk" });
    expect(parseCommand("x desk")).toEqual({ verb: "examine", target: "desk" });
  });

  it("parses inventory and its alias", () => {
    expect(parseCommand("inventory")).toEqual({ verb: "inventory" });
    expect(parseCommand("i")).toEqual({ verb: "inventory" });
  });

  it("parses use with an explicit target via 'on'", () => {
    expect(parseCommand("use key on door")).toEqual({ verb: "use", target: "key", secondTarget: "door" });
  });

  it("parses bare use with no explicit target", () => {
    expect(parseCommand("use key")).toEqual({ verb: "use", target: "key", secondTarget: undefined });
  });

  it("parses open and close, including the 'shut' alias for close", () => {
    expect(parseCommand("open drawer")).toEqual({ verb: "open", target: "drawer" });
    expect(parseCommand("close drawer")).toEqual({ verb: "close", target: "drawer" });
    expect(parseCommand("shut drawer")).toEqual({ verb: "close", target: "drawer" });
  });

  it("returns unknown for open/close missing a required target", () => {
    expect(parseCommand("open")).toEqual({ verb: "unknown", raw: "open" });
    expect(parseCommand("close")).toEqual({ verb: "unknown", raw: "close" });
  });

  it("parses take, drop, talk, health, map, restart, help", () => {
    expect(parseCommand("take key")).toEqual({ verb: "take", target: "key" });
    expect(parseCommand("drop key")).toEqual({ verb: "drop", target: "key" });
    expect(parseCommand("talk caretaker")).toEqual({ verb: "talk", target: "caretaker" });
    expect(parseCommand("talk")).toEqual({ verb: "talk", target: undefined });
    expect(parseCommand("health")).toEqual({ verb: "health" });
    expect(parseCommand("map")).toEqual({ verb: "map" });
    expect(parseCommand("restart")).toEqual({ verb: "restart" });
    expect(parseCommand("help")).toEqual({ verb: "help" });
    expect(parseCommand("?")).toEqual({ verb: "help" });
  });

  it("returns empty for blank input", () => {
    expect(parseCommand("   ")).toEqual({ verb: "empty" });
  });

  it("returns unknown for unrecognised verbs", () => {
    expect(parseCommand("dance")).toEqual({ verb: "unknown", raw: "dance" });
  });

  it("returns unknown for verbs missing a required target", () => {
    expect(parseCommand("go")).toEqual({ verb: "unknown", raw: "go" });
    expect(parseCommand("take")).toEqual({ verb: "unknown", raw: "take" });
  });

  it("parses walk as a plain synonym for go (never running), and run as go with running: true", () => {
    expect(parseCommand("walk door")).toEqual({ verb: "go", target: "door", running: false });
    expect(parseCommand("run door")).toEqual({ verb: "go", target: "door", running: true });
    expect(parseCommand("run")).toEqual({ verb: "unknown", raw: "run" });
    expect(parseCommand("grab key")).toEqual({ verb: "take", target: "key" });
  });

  it("parses 'look at X' and bare 'look X' as examine, but 'look' alone as look", () => {
    expect(parseCommand("look")).toEqual({ verb: "look" });
    expect(parseCommand("look at desk")).toEqual({ verb: "examine", target: "desk" });
    expect(parseCommand("look desk")).toEqual({ verb: "examine", target: "desk" });
  });
});
