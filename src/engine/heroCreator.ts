import type { PointBuyConfig, StatBlock, StatName } from "./types";
import type { PlayerProfile } from "./state";

export function createBaseStats(statNames: StatName[], config: PointBuyConfig): StatBlock {
  const stats = {} as StatBlock;
  for (const name of statNames) stats[name] = config.base;
  return stats;
}

export function pointsSpent(stats: StatBlock, statNames: StatName[], config: PointBuyConfig): number {
  return statNames.reduce((sum, name) => sum + (stats[name] - config.base), 0);
}

export function pointsRemaining(stats: StatBlock, statNames: StatName[], config: PointBuyConfig): number {
  return config.pool - pointsSpent(stats, statNames, config);
}

export function canIncrement(stats: StatBlock, name: StatName, statNames: StatName[], config: PointBuyConfig): boolean {
  return stats[name] < config.max && pointsRemaining(stats, statNames, config) > 0;
}

export function canDecrement(stats: StatBlock, name: StatName, config: PointBuyConfig): boolean {
  return stats[name] > config.min;
}

export function isAllocationComplete(stats: StatBlock, statNames: StatName[], config: PointBuyConfig): boolean {
  return pointsRemaining(stats, statNames, config) === 0;
}

export function createPlayerProfile(name: string, stats: StatBlock): PlayerProfile {
  return { name, stats };
}
