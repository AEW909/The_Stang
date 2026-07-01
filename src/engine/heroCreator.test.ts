import { describe, expect, it } from "vitest";
import { campaign } from "../data/campaign";
import {
  canDecrement,
  canIncrement,
  createBaseStats,
  isAllocationComplete,
  pointsRemaining,
} from "./heroCreator";

const { statNames, pointBuy } = campaign;

describe("hero creator point-buy", () => {
  it("starts every stat at the base value with the full pool remaining", () => {
    const stats = createBaseStats(statNames, pointBuy);
    for (const name of statNames) expect(stats[name]).toBe(pointBuy.base);
    expect(pointsRemaining(stats, statNames, pointBuy)).toBe(pointBuy.pool);
    expect(isAllocationComplete(stats, statNames, pointBuy)).toBe(false);
  });

  it("prevents raising a stat above the configured max", () => {
    const stats = createBaseStats(statNames, pointBuy);
    stats.bravery = pointBuy.max;
    expect(canIncrement(stats, "bravery", statNames, pointBuy)).toBe(false);
  });

  it("prevents lowering a stat below the configured min", () => {
    const stats = createBaseStats(statNames, pointBuy);
    stats.charm = pointBuy.min;
    expect(canDecrement(stats, "charm", pointBuy)).toBe(false);
  });

  it("prevents spending more points than the pool allows", () => {
    const stats = createBaseStats(statNames, pointBuy);
    // Spend the entire pool on one stat, capped by max.
    while (canIncrement(stats, "bravery", statNames, pointBuy)) stats.bravery += 1;
    expect(pointsRemaining(stats, statNames, pointBuy)).toBeGreaterThanOrEqual(0);
    expect(canIncrement(stats, "fight", statNames, pointBuy)).toBe(
      pointsRemaining(stats, statNames, pointBuy) > 0,
    );
  });

  it("is complete only once every pool point is spent", () => {
    const stats = createBaseStats(statNames, pointBuy);
    stats.bravery += 5;
    stats.fight += 5;
    expect(pointsRemaining(stats, statNames, pointBuy)).toBe(0);
    expect(isAllocationComplete(stats, statNames, pointBuy)).toBe(true);
  });
});
