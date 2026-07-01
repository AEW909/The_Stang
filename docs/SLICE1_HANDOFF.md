# The_Stang — Slice 1 Handoff Prompt for Claude Code

> This is a fresh build. There is a prior prototype at github.com/AEW909/last-bell (Vite/React/TypeScript/Vitest, pure-logic `engine.ts` + `data.ts` architecture) — **do not import from it or treat it as a starting point.** Its premise (locked classroom, detention) does not match this brief. You may look at it only as a reference for coding style/testing approach if useful, never for content or plot.
>
> **Companion document:** `docs/CAMPAIGN_BIBLE.md` in this repo holds the full campaign canon (NPC roster, locations, season spine, story-flag registry, and the Episode Brief template used for all future episodes). This document (Slice 1 handoff) is a single-use engineering brief — read it fully before starting, but treat the campaign bible as the living source of truth for any narrative content, including Episode 1's own character/location references.

---

## 1. Project brief

**What it is:** A browser-based, 1980s-terminal-style text adventure game — green text on black background, CRT aesthetic — built as a personal gift for a 10-year-old girl. It is a narrative campaign told across episodes (starting with 8, extensible later), combining exploration/parser gameplay, dialogue choices, light stat-based combat, and an NPC trust/relationship system.

**Who it's for:** One specific child player, solo use only. No accounts, no multiplayer, no analytics, no external users ever.

**The core value moment:** The player types commands into an authentic-feeling retro terminal to explore, investigate, and make choices that visibly shape relationships and outcomes — while never hitting a dead end that feels "broken." The fantasy is *being the hero of her own Stranger-Things-meets-D&D story*, not solving a rigid puzzle box.

**Setting/premise (Episode 1, locked):** Harper (player character) wakes up alone in her school. The caretaker attacks her, looking "zombie-esque." She escapes and walks home through a town that's eerily quiet (people, not everything — possibly her own imagination exaggerating it). She arrives home to find a note from her sister Camille, contents unknown — this is the episode's cliffhanger ending.

**Season 1 spine:** See `docs/CAMPAIGN_BIBLE.md` for the full season canon (Garstang setting, the Raven Queen/Mrs Reeves reveal, Camille's abduction and motive, the episode ladder). Slice 1 only needs to support Episode 1, but should not architect anything that forecloses the season spine described there.

---

## 2. The stack (fixed)

| Decision | Choice | Why |
|---|---|---|
| Framework | Vite + React 19 + TypeScript | No backend needed; React gives clean component boundaries for the terminal/dialogue/combat/hero-creator screens |
| Game logic | Pure, framework-free TypeScript engine (`engine.ts`), no React/DOM imports | Keeps game logic unit-testable without rendering; proven pattern from prior prototype |
| Testing | Vitest | Matches the pure-logic engine; write engine tests alongside engine code, not after |
| Story content | TypeScript/JSON data files committed to the repo, split into a **campaign file** (persistent world/character backbone) and **episode files** (one per episode, self-contained drops) — see Section 3a | Content is authored per-episode by the project owner, often in a separate narrative-planning conversation; the engine must be able to consume new episode files without any engine code changes |
| Player save state | Browser `localStorage` only | Single player, single device, no server round-trip risk; progress, inventory, stats, relationships, HP all live here |
| Hosting | Vercel, static deploy | No API routes, no SSR — this is a static SPA |
| Database | **None.** Do not add Supabase, Airtable, Firebase, or any other backend/database. | Explicitly rejected — single player, no sync need, adds failure modes with zero benefit |
| AI/LLM at runtime | **None.** No calls to any AI API during gameplay. | Explicitly rejected — creative interpretation is hand-authored by the writer, not generated at runtime. This is a hard boundary, not a placeholder for "later" |
| Repo | New repo: `The_Stang` | Clean break from prior prototype; do not fork or import it |

---

## 3. Conventions

- **Engine/content separation is sacred.** `engine.ts` (or equivalent module split) contains state management, the parser, command resolution, dice/roll logic, save/load — zero references to specific episodes, characters, or story text. `data/` contains all story content: rooms, items, dialogue trees, NPC definitions. A new episode should be addable by writing new data files, not by editing engine code, except where an episode requires a genuinely new *mechanic* (which should be rare and flagged).
- **Parser vocabulary stays constrained and visible.** Core verbs: `go`/`n`/`s`/`e`/`w`, `look`/`l`, `examine`/`x`, `inventory`/`i`, `take`, `drop`, `use`, `talk`, `health`, `map`, `restart`, `help`/`/?`. Interactable objects are shown in CAPS in room descriptions. A suggestions bar above the input shows contextually relevant commands for the current scene. This matches the tone established by the original prototype and should carry through.
- **Dialogue and combat are menu-driven** (numbered choices), not parsed free text — this is a deliberate departure from exploration, made because both need precise branching and stat-checking logic that free text can't support reliably.
- **Items are explicitly tagged `essential` or `flavour` in their data definition.** Essential items have exactly one valid use and cannot be repurposed. Flavour items may have 0–4 hand-authored scene-specific `USE` outcomes; any `USE` attempt not specifically authored for the current scene must return a graceful, in-character non-broken fallback (never a generic error). This tagging and the fallback behavior are core engine contracts, not per-episode afterthoughts — build them into the engine from Slice 1 even though Episode 1 will only lightly exercise them.
- **Checkpoints save at the end of every scene**, not just at episode boundaries. Death/failure states restart from the most recent scene checkpoint, not the start of the episode.
- **File/folder naming:** lowercase-kebab or camelCase consistent with the language convention already implied by TS/React tooling (component files PascalCase, logic/data files camelCase) — pick one standard in the first commit and hold it for the whole project.

---

## 3a. Campaign/episode data architecture (build this into Slice 1)

This is a core reusability requirement, not an optional nicety: the project owner needs to be able to write a new episode in a separate narrative-planning conversation, get a structured output from it (an "Episode Brief" — see `docs/CAMPAIGN_BIBLE.md` for the template), and hand that to Claude Code as a near-mechanical "add this episode" task — without Claude Code needing to re-learn the world, rebalance the engine, or touch existing episode files. Slice 1 should establish this structure properly even though only one episode exists yet, because retrofitting it once several episodes' worth of content exists is expensive.

**Two-tier structure:**

1. **Campaign file** (e.g. `data/campaign.ts`) — the persistent backbone, changes rarely:
   - World/location registry — each location has a stable ID that episodes reference, not redefine. Content sourced from `docs/CAMPAIGN_BIBLE.md`'s locations table.
   - Player character template — the five-stat schema (Bravery, Fight, Flight, Smarts, Charm), point-buy config, starting inventory rules.
   - NPC roster — every named character, each with a stable ID, skill tag, starting trust/honesty values, and a short canonical description. Content sourced from `docs/CAMPAIGN_BIBLE.md`'s NPC table. Episodes reference NPCs by ID and may adjust their trust values or add dialogue, but the roster itself lives here once, not per-episode.
   - **Global story-flags** — a flat, persistent key/value state (e.g. `hasMetAkira`, `mrsAyersFound`) that any episode can read or write. This is the mechanism that lets episodes affect each other without being tightly coupled. Seed list is in the campaign bible.
   - Item registry conventions (the essential/flavour tagging contract from Section 3) — shared rules, not shared item instances; each episode still defines its own items.

2. **Episode files** (e.g. `data/episodes/episode1.ts`, `episode2.ts`, ...) — one per episode, each self-contained:
   - Episode metadata: number, title, and any story-flag *prerequisites* required before it can start (mostly unused until multiple episodes exist, but the field should exist from episode 1).
   - Scenes/rooms specific to this episode, referencing campaign location IDs where the location already exists, defining new ones where it doesn't.
   - Items introduced in this episode, tagged essential/flavour per the existing contract.
   - Dialogue and encounters, referencing campaign NPC IDs.
   - Scene checkpoint boundaries (per Section 5's Slice 1 requirement).
   - Story-flags this episode reads and writes.
   - The episode's ending/transition state.

**Engine requirement:** the engine must load the campaign file once, then load whichever episode file is "current," resolving NPC/location/flag references between them. Adding episode 2 should mean *writing a new file*, not editing the engine or Episode 1's file. Prove this in Slice 1 by structuring Episode 1 as `episode1.ts` referencing `campaign.ts`, even though there's nothing yet for it to conflict with — the point is establishing the pattern correctly under real conditions, not simulating a second episode.

**When a future Episode Brief includes a "NEW CANON ADDITIONS" section** (new locations, NPCs, or flags), those additions should be applied to both `data/campaign.ts` (the code) and `docs/CAMPAIGN_BIBLE.md` (the canon document) in the same pass — the two must never drift out of sync. If asked to implement an Episode Brief, always check whether its canon additions have already been reflected in the bible, and update it if not.

---

## 4. Scope boundaries — explicitly OUT for this build

- No multiplayer, no accounts, no login, no analytics.
- No backend/database of any kind.
- No AI/LLM calls at runtime, for any purpose (dialogue generation, "understanding" free text, image generation, anything).
- No full combat system in Episode 1. Episode 1 has zero fights — the caretaker encounter and any other threats are **evasion/side-step encounters** (avoid, flee, distract, outsmart), not HP-based combat.
- No NPC party system, no trust/honesty stats, no skill-tag-based NPC selection in Slice 1 — Harper is alone for the entirety of Episode 1. These systems are real and specified for future slices, but must not be built prematurely into Slice 1's scope.
- No illustrated/graphics-heavy presentation — occasional images and ASCII art may be added later by the project owner, but Slice 1 should assume text-only unless told otherwise.
- Do not invent or add any story content, NPCs, locations, or plot beats beyond what's specified in this document and `docs/CAMPAIGN_BIBLE.md`. If Episode 1 needs a scene beat neither document covers, stop and ask rather than inventing one.

---

## 5. Build sequence

### Slice 1 — Engine + Hero Creator + Episode 1 (build this precisely, now)

This is the only slice to build in full detail right now. It must deliver a complete, playable, saveable Episode 1.

**Scope:**
1. **Hero creator** — runs once, before Episode 1 begins. Point-buy allocation across five stats: **Bravery, Fight, Flight, Smarts, Charm**. Define a sensible point pool and per-stat min/max (propose values and state your reasoning; this is a numbers-balance detail I'll sanity check, not a blocking question). Result is saved to `localStorage` as part of the player profile before Episode 1 loads.
2. **Campaign/episode file structure** — implement `data/campaign.ts` (world/location registry, PC stat template, full NPC roster per `docs/CAMPAIGN_BIBLE.md` with stable IDs, and the global story-flag store) and `data/episodes/episode1.ts` (Episode 1's content only, referencing campaign IDs). See Section 3a — this is a Slice 1 requirement even though only one episode exists yet.
3. **Terminal UI** — green-on-black CRT-style presentation, command input with suggestions bar above it showing valid commands for the current scene, CAPS-highlighted interactable objects in room text.
4. **Parser + exploration engine** — supports the verb set listed in Conventions above. Player moves through Episode 1's locations (school interior → route home → Harper's house) via `go`/direction commands and location-specific exits.
5. **Item system** — implement the essential/flavour tagging and USE-fallback behavior described above, even though Episode 1 likely only needs a small number of items. Build the contract properly now so later episodes don't need engine rework.
6. **Evasion encounters** — the caretaker confrontation (and any other Episode 1 threat) is resolved through situational commands (flee, hide, distract, use an item) rather than a combat/HP system. A failed evasion should be recoverable (retry, or minor setback), not an instant unrecoverable death, unless you and I explicitly design it that way later.
7. **Checkpoint/save system** — save state to `localStorage` at the end of each scene (define what constitutes a "scene" boundary in Episode 1 — propose your scene breakdown and state it). Support resuming a saved game on reload. Support `restart` to reset from the last checkpoint.
8. **Episode 1 content**, written to the premise above: wake alone in the school → escape the building (caretaker evasion encounter along the way) → walk home through an unnervingly quiet town → arrive home → find Camille's note. **The note's contents are not yet decided — write it as a hook that establishes urgency and confusion without resolving anything (Camille is gone, something's wrong, no explanation given), and flag it clearly as a placeholder I will likely want to hand-write myself.**
9. Episode ends on the note as a hard stop / cliffhanger screen — no Episode 2 content, just a clear "end of episode" state.

**Acceptance criteria for Slice 1:**
- A new player can run the hero creator, get to Episode 1, play it start to finish using only the documented verb set, and reach the note cliffhanger.
- Closing the browser and reopening resumes from the last scene checkpoint, with hero stats and inventory intact.
- At least one item is tagged `essential` and at least one is tagged `flavour` with a couple of authored `USE` outcomes, demonstrating both paths work, including the non-broken fallback for an unauthored `USE`.
- The caretaker (or equivalent) encounter can be evaded through more than one method (e.g. an item-based option and a pure command-based option).
- Engine logic (parser, state transitions, save/load, item resolution) has Vitest coverage, written alongside the engine, not bolted on after.
- `restart` correctly returns to the last scene checkpoint, not the very start of the episode.
- `data/campaign.ts` and `data/episodes/episode1.ts` are genuinely separate files with a clean reference boundary — Episode 1's file should not redefine locations, NPCs, or stats that belong in the campaign file, and the campaign file should contain no Episode-1-specific scene content.

### Slice 2 (rough — do not build yet, sketch only for later)
Dialogue system (menu-driven, branching), NPC introductions (Ellie, Isabella, Akira, Joshua), NPC trust/honesty as numeric variables that shift based on interaction choices. Episode 2 content: Harper realizes Camille is missing, reaches out to the friend group.

### Slice 3 (rough — sketch only)
Light combat engine: D&D-style dice + modifiers tied to Harper's five stats, real HP, real death risk with scene-checkpoint restart. NPC skill tags (not stat blocks) enabling situational "choose who helps" mechanics in both combat and non-combat challenges. Team-up mechanic: a limited-use NPC action granting Harper's roll advantage/a bonus, not spammable. Episode 3 content.

### Slices 4–8 (provisional — not sketched, will be scoped once Slice 1–3 prove the engine)
Episodes 4 through 8, escalating per the season spine in `docs/CAMPAIGN_BIBLE.md`, to be planned once the engine's core systems are validated in play.

---

## 6. Known risks / decision points

- **The essential/flavour item USE-fallback system is the highest-complexity part of Slice 1 despite Episode 1 barely needing it.** Build the contract properly now (it's expensive to retrofit once many episodes depend on it), but don't over-engineer Episode 1's actual item list — a couple of items proving the pattern is enough.
- **Scene checkpoint granularity is a judgment call.** Too coarse (checkpoint only at episode start) defeats the purpose; too fine (checkpoint every single command) is unnecessary complexity. Propose a scene breakdown for Episode 1 and state your reasoning — this is a case where I want you to make a call and show your work, not silently decide or block on asking.
- **The evasion-encounter design for the caretaker needs to feel tense, not trivial or unfair**, given this is effectively a horror beat for a 10-year-old player. Err toward "recoverable failure with a scare," not "instant unrecoverable death" or "no real stakes at all," unless directed otherwise.
- **Hero creator stat ranges** will need real playtesting/balancing once combat exists in Slice 3 — don't over-invest in getting point-buy numbers perfect now, just make them sensible and easy to rebalance later (i.e., keep point costs/ranges in one config location, not scattered through code).

---

## 7. Verification

After Slice 1 is built:
1. Run `npm test` — all engine tests pass.
2. Run `npm run dev`, play Episode 1 start to finish using only documented commands, confirm the cliffhanger note screen is reached.
3. Reload the browser mid-episode (after at least one checkpoint) and confirm state resumes correctly (location, inventory, stats).
4. Deliberately trigger the caretaker evasion encounter's failure path and confirm `restart` returns to the last scene checkpoint, not episode start.
5. Attempt a `USE` on a flavour item in a scene where it has no authored outcome — confirm the fallback response is graceful and in-character, not an error or dead end.
6. Confirm no network calls occur during gameplay (no AI API calls, no database calls) — this should be verifiable just by inspecting the code, since none should exist.

---

## 8. Handling uncertainty

Before writing any code, restate your understanding of Slice 1's scope back to me in your own words, including your proposed scene-checkpoint breakdown for Episode 1 and your proposed hero-creator point-buy numbers, and wait for confirmation before proceeding.

If anything in Episode 1's content (beyond what's explicitly specified in this document and `docs/CAMPAIGN_BIBLE.md`) is ambiguous — dialogue phrasing, exact room layout, specific wording of the caretaker encounter — make a reasonable creative choice, clearly flag it as a placeholder/draft in a code comment, and keep moving; don't block on every content-level judgment call. But if anything about the **system/architecture** is ambiguous (how checkpoints are structured, how the essential/flavour item contract should be implemented, anything that would be expensive to change once Episode 2 depends on it), stop and ask rather than guessing.
