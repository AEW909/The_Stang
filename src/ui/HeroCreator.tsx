import { useState } from "react";
import type { StatBlock, StatName } from "../engine/types";
import { campaign } from "../data/campaign";
import {
  canDecrement,
  canIncrement,
  createBaseStats,
  createPlayerProfile,
  isAllocationComplete,
  pointsRemaining,
} from "../engine/heroCreator";
import type { PlayerProfile } from "../engine/state";

const STAT_LABELS: Record<StatName, string> = {
  bravery: "Bravery",
  fight: "Fight",
  flight: "Flight",
  smarts: "Smarts",
  charm: "Charm",
};

export function HeroCreator({ onComplete }: { onComplete: (profile: PlayerProfile) => void }) {
  const { statNames, pointBuy } = campaign;
  const [stats, setStats] = useState<StatBlock>(() => createBaseStats(statNames, pointBuy));

  const remaining = pointsRemaining(stats, statNames, pointBuy);
  const complete = isAllocationComplete(stats, statNames, pointBuy);

  function increment(name: StatName) {
    if (!canIncrement(stats, name, statNames, pointBuy)) return;
    setStats({ ...stats, [name]: stats[name] + 1 });
  }

  function decrement(name: StatName) {
    if (!canDecrement(stats, name, pointBuy)) return;
    setStats({ ...stats, [name]: stats[name] - 1 });
  }

  return (
    <div className="crt-screen">
      <pre className="crt-title">HARPER — CHARACTER CREATION</pre>
      <p>
        Allocate your points. You have <strong>{remaining}</strong> point{remaining === 1 ? "" : "s"} left to spend
        (min {pointBuy.min}, max {pointBuy.max} per stat).
      </p>
      <div className="stat-grid">
        {statNames.map((name) => (
          <div className="stat-row" key={name}>
            <span className="stat-label">{STAT_LABELS[name]}</span>
            <button type="button" onClick={() => decrement(name)} disabled={!canDecrement(stats, name, pointBuy)}>
              -
            </button>
            <span className="stat-value">{stats[name]}</span>
            <button
              type="button"
              onClick={() => increment(name)}
              disabled={!canIncrement(stats, name, statNames, pointBuy)}
            >
              +
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="confirm-button"
        disabled={!complete}
        onClick={() => onComplete(createPlayerProfile("Harper", stats))}
      >
        {complete ? "BEGIN EPISODE 1" : `SPEND ${remaining} MORE POINT${remaining === 1 ? "" : "S"}`}
      </button>
    </div>
  );
}
