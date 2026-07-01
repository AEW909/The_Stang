// Persistent campaign backbone: world/location registry, PC stat template,
// NPC roster, and global story-flags. Changes rarely. Sourced from
// docs/CAMPAIGN_BIBLE.md. Episode files reference this data by ID; they must
// never redefine it.
//
// If a future Episode Brief's "NEW CANON ADDITIONS" section adds anything
// here, update docs/CAMPAIGN_BIBLE.md's tables in the same pass.

import type { Campaign, LocationDef, NpcDef, PointBuyConfig, StatName } from "../engine/types";

export const STAT_NAMES: StatName[] = ["bravery", "fight", "flight", "smarts", "charm"];

// Base 3 / pool 10 / max 8: floor keeps every stat usable, ceiling leaves
// room for Slice 3's dice+modifier combat to matter, and pool == 2x the
// base-to-max gap means "specialise in exactly two stats" is the natural
// ceiling case - an easy mental model for a first-time player.
export const POINT_BUY: PointBuyConfig = {
  base: 3,
  pool: 10,
  min: 3,
  max: 8,
};

const locations: LocationDef[] = [
  { id: "harpers_house", name: "Harper's house" },
  { id: "school", name: "Garstang school" },
  { id: "sports_complex", name: "Sports complex" },
  { id: "high_street", name: "High street" },
  { id: "supermarket", name: "Supermarket" },
  { id: "library", name: "Library" },
  { id: "grandmas_house", name: "Grandma's house" },
  { id: "park", name: "Park" },
  { id: "skate_park", name: "Skate park" },
  { id: "river_walk", name: "Riverside walk" },
  // Not accessible until late-season (Episode 7+); enforced via unlockFlag.
  { id: "raven_cabin", name: "The cabin", unlockFlag: "portalDiscovered" },
];

const npcs: NpcDef[] = [
  {
    id: "ellie",
    name: "Ellie",
    description: "Blonde, wavy hair, blue eyes, glasses (usually). Mild-mannered, friendly, always polite.",
    skillTag: "Reliable / Direct",
    trust: 75,
    honesty: 75,
  },
  {
    id: "isabella",
    name: "Isabella",
    description: "Shorter, pale, dark brown/black hair, slightly bulging eyes. Sly and sneaky, secretly insecure.",
    skillTag: "Cunning / Stealth",
    trust: 75,
    honesty: 60,
  },
  {
    id: "akira",
    name: "Akira",
    description: "Blonde, straight hair, glasses, round face. Very polite to adults, moody and dramatic with friends.",
    skillTag: "Drama / Distraction",
    trust: 75,
    honesty: 75,
  },
  {
    id: "joshua",
    name: "Joshua",
    description: "Ginger, curly hair, short. Loud, funny, a bit naive, loyal.",
    skillTag: "Dependable / Physical",
    trust: 75,
    honesty: 75,
  },
  {
    id: "camille",
    name: "Camille",
    description: "Harper's sister. Taken by the Raven Queen.",
    trust: 50,
    honesty: 50,
  },
  {
    id: "liona",
    name: "Liona (Mum)",
    description: "Oblivious/explained-away for Season 1.",
    trust: 50,
    honesty: 50,
  },
  {
    id: "mrs_reeves",
    name: "Mrs Reeves",
    description: "Likeable, normal-seeming headteacher.",
    trust: 50,
    honesty: 50,
  },
  {
    id: "mr_dignan",
    name: "Mr Dignan",
    description: "Tall, vampire-esque. \"Too nice.\"",
    trust: 50,
    honesty: 50,
  },
  {
    id: "mrs_russell",
    name: "Mrs Russell",
    description: "A teacher at Garstang school.",
    trust: 50,
    honesty: 50,
  },
  {
    id: "mr_wilkinson",
    name: "Mr Wilkinson",
    description: "A teacher at Garstang school. Suspects something's wrong.",
    trust: 50,
    honesty: 50,
  },
  {
    id: "mrs_ayers",
    name: "Mrs Ayers",
    description: "Retired abruptly from Garstang school.",
    trust: 50,
    honesty: 50,
  },
  {
    id: "caretaker",
    name: "The caretaker",
    description: "The school caretaker. Something is very wrong with him.",
    trust: 50,
    honesty: 50,
  },
];

export const campaign: Campaign = {
  locations: Object.fromEntries(locations.map((l) => [l.id, l])),
  npcs: Object.fromEntries(npcs.map((n) => [n.id, n])),
  statNames: STAT_NAMES,
  pointBuy: POINT_BUY,
  // Seed list per docs/CAMPAIGN_BIBLE.md's story-flag registry. Episodes may
  // read/write these; new flags should be added here and to the bible
  // together, never forked into a single episode file.
  initialFlags: {
    camilleNoteFound: false,
    caretakerEvaded: false,
    hasMetEllie: false,
    hasMetIsabella: false,
    hasMetAkira: false,
    hasMetJoshua: false,
    dignanSuspected: false,
    mrsAyersFound: false,
    mrsRussellConfirmed: false,
    doppelgangerRevealed: false,
    wilkinsonRoleClarified: false,
    portalDiscovered: false,
  },
};
