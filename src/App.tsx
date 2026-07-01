import { useEffect, useState } from "react";
import { HeroCreator } from "./ui/HeroCreator";
import { Terminal, type TerminalLine } from "./ui/Terminal";
import { campaign } from "./data/campaign";
import { episode1 } from "./data/episodes/episode1";
import { createInitialState } from "./engine/state";
import type { GameState, PlayerProfile } from "./engine/state";
import { getSuggestions, processCommand } from "./engine/commands";
import { loadGame, saveGame } from "./engine/save";

const episode = episode1;

function describeRoomLines(state: GameState): TerminalLine[] {
  // Route through "look" so room text has exactly one source of truth.
  const result = processCommand(state, campaign, episode, "look");
  return result.output.map((text) => ({ kind: "output", text }));
}

export default function App() {
  const [state, setState] = useState<GameState | null>(null);
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = loadGame();
    if (saved) {
      setState(saved);
      const resumeLines = saved.ended
        ? [{ kind: "output" as const, text: episode.endingText }]
        : describeRoomLines(saved);
      setLines([{ kind: "output", text: "-- Resuming your saved game --" }, ...resumeLines]);
    }
    setLoaded(true);
  }, []);

  function handleHeroComplete(profile: PlayerProfile) {
    const initial = createInitialState(profile, campaign.initialFlags, episode);
    saveGame(initial);
    setState(initial);
    setLines([
      { kind: "output", text: `-- ${episode.title} --` },
      ...describeRoomLines(initial),
    ]);
  }

  function handleCommand(raw: string) {
    if (!state) return;
    const result = processCommand(state, campaign, episode, raw);
    setState(result.state);
    saveGame(result.state);
    const outputLines: TerminalLine[] = result.output.map((text) => ({ kind: "output", text }));
    setLines((prev) => [...prev, { kind: "input", text: raw }, ...outputLines]);
  }

  if (!loaded) return null;

  if (!state) {
    return <HeroCreator onComplete={handleHeroComplete} />;
  }

  return <Terminal lines={lines} suggestions={getSuggestions(state, episode)} onSubmit={handleCommand} />;
}
