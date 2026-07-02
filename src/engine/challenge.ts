import type { ChallengeDef, EpisodeDef } from "./types";

export function findChallenge(episode: EpisodeDef, challengeId: string): ChallengeDef {
  const challenge = episode.challenges.find((c) => c.id === challengeId);
  if (!challenge) throw new Error(`Unknown challenge: ${challengeId}`);
  return challenge;
}

export function findChallengeForRoom(episode: EpisodeDef, roomId: string): ChallengeDef | undefined {
  return episode.challenges.find((c) => c.roomId === roomId);
}

export function describeChallenge(challenge: ChallengeDef): string[] {
  const lines = [challenge.prompt];
  challenge.options.forEach((option, i) => lines.push(`${i + 1}. ${option.label}`));
  return lines;
}
