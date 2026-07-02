# The_Stang — Slice 1 Handoff Prompt for Claude Code

> This is a fresh build. There is a prior prototype at github.com/AEW909/last-bell (Vite/React/TypeScript/Vitest, pure-logic `engine.ts` + `data.ts` architecture) — **do not import from it or treat it as a starting point.** Its premise (locked classroom, detention) does not match this brief. You may look at it only as a reference for coding style/testing approach if useful, never for content or plot.
>
> **Companion document:** `docs/CAMPAIGN_BIBLE.md` in this repo holds the full campaign canon (NPC roster, locations, season spine, story-flag registry, and the Episode Brief template used for all future episodes). This document (Slice 1 handoff) is a single-use engineering brief — read it fully before starting, but treat the campaign bible as the living source of truth for any narrative content, including Episode 1's own character/location references.

---

## 0. Status: Slice 1 shipped, Slice 2 engine core built

**Slice 1 is complete, verified, and shippable as of 2026-07-01.** All acceptance criteria in Section 5 passed (initially 54 Vitest tests, now 111 after later additions — see below), clean `tsc`, full manual playthrough including reload-resume, evasion failure + `restart`, and the flavour-item fallback. Pushed to `main` on the `AEW909/The_Stang` GitHub repo.

Two decision points this document originally left open were resolved during the build and are now locked:
- **Hero-creator point-buy:** base 3 / pool 10 / max 8 per stat (min 3, can't go lower). Confirmed as a good balance — "at 8 points, each upgrade is a meaningful increase in ability."
- **Episode 1 scene/checkpoint breakdown:** five scenes — Waking Up, The Caretaker, Escape the School, The Quiet Walk Home, Home — each its own checkpoint boundary. See Section 5 for the original reasoning.

Additions on top of the original Slice 1 scope, at the project owner's request, now part of the standing engine contract (see Section 3):
- **`open`/`close` (+ `shut`) verbs**, for containers with real, persisted, checkpointed open/closed state.
- **Deterministic room descriptions** — a room's authored `description` never names an ordinary prop directly; `look` auto-appends a "You can also see" line from whichever interactables are currently revealed and not yet taken.
- **The caretaker evasion was redesigned** after first playtest feedback that hiding in the closet made him silently vanish with no payoff. It's now a genuine choice moment: `go closet` (always succeeds, now with real narration), `go push` (Fight ≥ 7), `go dodge` (Flight ≥ 7) — both deterministic, no dice, and both fail recoverably with distinct scares if the stat isn't there — plus a new `go back` retreat to the locker corridor so a failed attempt can go grab the fire extinguisher and return. This is also where `ExitDef.requires` and `ExitDef.successText` were added (see Section 3), and where a real bug was caught and fixed: allowing backward travel into an earlier scene could have let a checkpoint **regress** — fixed so checkpoints only ever advance forward, never backward, regardless of which way the player physically walks.

**Slice 2's engine core (dialogue, live trust/honesty, decisions, party) is built and tested, but Episode 2 content has not been written.** See Section 5 update below.

**A full exploratory playthrough audit (examine/try everything, not just the golden path) found and fixed four issues, none of which showed up in the existing test suite because it only ever exercised "correct" phrasing/paths:**
- Target matching didn't tolerate leading articles ("examine the desk", "take the key" all failed) — see the new bullet on this in Section 3. High-impact given the actual player is a child who will type "the" constantly.
- The new push/dodge/hide exit words from the caretaker redesign only worked as `go push` etc., not bare `push` — also fixed in Section 3, same commit.
- The fire extinguisher's scene-1 joke text named a fixture (the noticeboard) that doesn't exist in one of the two rooms that scene covers (the classroom) — reworded to be room-agnostic.
- The classroom door's bare `go door` auto-unlock showed the key's unlock text but skipped the key's `essentialUse.effects`, unlike the explicit `use key on door` path — harmless today (the only effect is a redundant move) but a latent trap for a future essential item; now both paths run the same effects.

**Follow-up pass, at the project owner's request, addressed everything from the "noted but deliberately left as-is" list above:**
- The fire extinguisher is now consumed (`removeItem`) the moment it's sprayed on the caretaker, instead of sitting in inventory forever.
- Parser vocabulary expanded: `walk`/`run` alias to `go`, `grab` aliases to `take`, and `look at X` / bare `look X` are now synonyms for `examine X` (`look` alone still describes the room). Target matching also now strips leading prepositions (`into`/`through`/`to`/`towards`) the same way it already stripped articles, including combinations ("into the closet" → "closet") — see `stripLeadingFillers` in `engine/commands.ts`.
- The classroom door's unlock narration ("the key turns with a satisfying clunk") now plays once per exit, not on every single pass — tracked via the same `openState` map reused as a generic per-room boolean store, not a new piece of `GameState`.

**A standing playthrough procedure was written up as `docs/VERIFICATION_CHECKLIST.md`** (referenced from the campaign bible's Episode Brief handoff instruction and from Section 7 below), after two full audits of Episode 1 found bugs no "correct path only" test could have caught. One item on that checklist — pacing/obstacle cadence — flagged a real design gap: Episode 1's room sequence had a 7-room stretch (corridor 3 through the note) with nothing to actually do, confirmed by an automated version of the check (`engine/pacingAudit.ts`, kept as a permanent test in `engine/pacing.test.ts`) before any content was touched. Fixed in two passes:
- A beat in the park: Harper finds Camille's scarf caught on the swings; taking it sets `chasedFromPark` and triggers a wordless chase the rest of the way home (no new fail-state or dice). This is where `InteractableDef.onTakeEffects` and `ExitDef.alternateSuccessText` were added (see Section 3).
- A genuine timed puzzle at the front doors: they're locked; a button hidden under the reception desk releases them for a short window, but only `RUN` (not `GO`/`WALK`) gets through in time — using the wrong verb re-locks them, fully recoverable by going back and pressing the button again. Getting `RUN`'s design right took two iterations: first as a hidden `via` string on the `GO` command (rejected — a mechanically meaningful distinction shouldn't be buried in an alias), briefly as a fully separate `ParsedCommand` verb (rejected in turn — it duplicated dispatch for something `resolveGo` already treats as one case), settling on `GO` carrying an explicit, always-present `running: boolean` field. This is also where `InteractableDef.onUseEffects`/`useText` were added so `USE` can apply to a fixed-in-place fixture (a button, not an inventory item) — see Section 3.
- Net result: the longest obstacle-free stretch dropped from 7 rooms to 1.

A small **WALKING/RUNNING indicator** was added to the terminal UI (`src/App.tsx`, `src/ui/Terminal.tsx`) once `RUN` became mechanically meaningful — a passive badge next to the input that updates after every `go`/`run` command (and stays as-is for anything else), confirming which way the last move actually registered. It's UI-only state, not persisted and not part of `GameState` — derived by calling `parseCommand` a second time purely for display, so the engine's return type never has to carry UI concerns.

**A fourth interaction primitive was added: `ChallengeDef` ("key decision / skill check")** — a key-decision/skill-check moment distinct from both free exploration and dialogue. Built fresh (the caretaker encounter was deliberately left as its existing exit-based implementation, not retrofitted — see Section 3 for the full contract). Two usage shapes, both already exercised in `engine/challenge.test.ts`'s fixture: room-scoped (auto-activates on entry, e.g. a physical obstacle) and roomless (`startChallenge` effect, triggered from a dialogue choice or interactable — e.g. "who do you bring"). This is where `describeRoom` changed from returning `string[]` to a full `CommandResult`, since activating/cancelling a challenge on room entry needed to mutate state as part of describing the room, not just format text.

**Real playtest feedback (Harper's own run) surfaced two more parser gaps neither audit had caught:** `push button`/`press button` didn't work — she had to know to type `use button` — and `run through door`/`run out` failed at the front doors. Root causes and fixes:
- `push`/`press` weren't registered as verbs at all, and couldn't simply become global aliases for `use` — `push`/`push past` are already meaningful *exit* words in the caretaker room, so a global alias would've split `push past` into verb=`push` + target=`past` and broken that encounter. Fixed with a narrower fallback in the `unknown`-verb branch of `processCommand` (`engine/commands.ts`): after the existing bare-exit-word check fails to match, `/^(push|press)\s+(.+)$/` resolves the rest as `USE <target>`. Exit-based `push`/`push past` still wins whenever it's a valid exit in that room, since that check runs first.
- The Front Doors room is literally called "Front Doors" and its description says "the double doors," but the exit's `aliases` only listed `out`/`forward`/`e` — never `door`/`doors`. Added them.
- Net effect: this is the second time real usage (a literal 10-year-old typing what feels natural, not what the spec anticipated) found something the checklist and the automated pacing audit couldn't — both check *structure* (phrasing tolerance is item 1 on `VERIFICATION_CHECKLIST.md`, but only as manual spot-checks against words the tester thought to try). Worth remembering for Episode 2: budget for a playtest pass with the actual player, not just self-review.

A `?reset` URL query param (undocumented in the UI, see `src/App.tsx`) wipes the `localStorage` save on load, for the project owner to clear their own testing progress before handing the game to its actual player.

Camille's note (`data/episodes/episode1.ts`, `hallway` room) is still placeholder text, flagged in the file for the project owner to hand-write.

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
- **Parser vocabulary stays constrained and visible.** Core verbs: `go`/`n`/`s`/`e`/`w`, `look`/`l`, `examine`/`x`, `inventory`/`i`, `take`, `drop`, `use`, `open`, `close`/`shut`, `talk`, `health`, `map`, `restart`, `help`/`/?`. Interactable objects are shown in CAPS in room descriptions. A suggestions bar above the input shows contextually relevant commands for the current scene. This matches the tone established by the original prototype and should carry through.
- **Target matching is filler-word-tolerant and has a bare-exit fallback**, found by a full playthrough exploring/examining everything: a young player types "the"/"a"/"an" and prepositions like "into"/"through"/"to" constantly ("examine the desk", "go into the closet"), so all target matching strips leading filler words one at a time before comparing — "into the closet" reduces to "closet" (see `stripLeadingFillers` in `engine/commands.ts`). Separately, a single word that isn't a recognised verb but does name a current-room exit alias (e.g. bare `push`, `dodge`, `hide`, `back` instead of `go push`) is treated as `go <word>` — this matters specifically for exit aliases like the caretaker encounter's, which are the exact words the suggestions bar surfaces. Verb vocabulary also has natural synonyms: `walk`/`run` → `go`, `grab` → `take`, `look at X`/bare `look X` → `examine X`.
- **Room descriptions are deterministic, not hand-assembled.** A room's `description` is fixed atmosphere/exit/NPC text only — it never names an ordinary prop directly. Every prop gets a `shortDescription`; `look` auto-appends a "You can also see" line built from whichever interactables are currently revealed (not hidden inside a closed container) and not yet taken (checked against inventory, no separate "taken" bookkeeping needed). An interactable can opt out via `excludeFromList` for NPCs and plot-critical objects that deserve full prose instead of a bullet. This is a core engine contract (see `describeRoom` in `engine/commands.ts`), not a per-episode formatting choice — it exists so room text and room data can never silently drift out of sync as more episodes are added.
- **Containers use `open`/`close`, not `examine`, to reveal what's inside.** An interactable marked `containedIn: <containerId>` is invisible to `look`/`examine`/`take` until that container is opened; opening/closing is real, persisted, checkpointed state (`GameState.openState`), not a one-way flag. This is how "Harper opens a drawer/cupboard and something new becomes visible" is meant to be authored going forward.
- **Taking an item can trigger story effects, not just examining one.** `InteractableDef.onTakeEffects` mirrors the existing `onExamineEffects` — for a pickup that's also a plot trigger (e.g. finding a keepsake that sets off a chase), not just a note you read. Similarly, `ExitDef.alternateSuccessText` lets one exit narrate differently once a flag is set (a calm walk vs. a chase down the same path), instead of needing two exits or a new gating mechanism.
- **`USE` can apply to a fixed-in-place fixture, not just an inventory item.** `InteractableDef.onUseEffects`/`useText` let a button, lever, or switch respond to `USE` directly — it's never picked up first. `resolveUse` checks inventory items first, then falls back to the current room's interactables.
- **`RUN` resolves to the same `go` `ParsedCommand`, carrying an explicit `running: boolean`.** `WALK` is a plain synonym for `GO` and always sets `running: false`; only the literal word "run" sets it `true`. The field is required, not optional, specifically so a mechanically meaningful distinction (some exits only succeed if the player ran, not walked) can never be silently dropped or forgotten — it's always there to read, whether or not the current room's exits care about it. Pattern for a timed dash: pair `ExitDef.requiresRun` with `requiresFlag` on the same exit (the flag is the "window" a switch opens); if the window is open but the player passed `running: false`, the flag is automatically cleared (the window closes) and `wrongRunText` explains why, fully recoverable by re-opening the window and trying again.
- **Checkpoints save at the end of every scene**, not just at episode boundaries. Death/failure states restart from the most recent scene checkpoint, not the start of the episode. **Checkpoints only ever advance forward** — if a room lets the player physically backtrack into an earlier scene (e.g. a retreat exit), `currentSceneId` follows their real location (scene-scoped content like flavour-item outcomes depends on that being accurate), but the checkpoint itself is never overwritten with an earlier scene. See `syncSceneAndCheckpoint` in `engine/commands.ts`.
- **Deterministic stat/trust gates ("Fallout-style, no dice")** come in two flavours with different rules, both using the shared `Requirement` type (`{stat, min}` or `{npcId, minTrust}`):
  - **Dialogue choices** (`DialogueChoice.requires`): the gated choice is *hidden* until qualified, and must only ever be a bonus/reward path — every `DialogueNode` needs at least one unconditional choice, enforced by `validateDialogueTree` (see `engine/dialogue.ts`), so a gate can never block a conversation.
  - **Exits** (`ExitDef.requires`): the opposite — the option stays visible/attemptable regardless of the player's stats, and failing it is a real, recoverable outcome (the tension mechanic for things like the caretaker evasion), not a hidden path. An exit's `successText` narrates what happens on success, separate from the destination room's own description — added specifically so a successful evasion method (e.g. hiding in a closet) explains what happened to the threat, rather than it silently vanishing.
- **Dialogue is menu-driven** (numbered choices), not parsed free text — a deliberate departure from exploration. While a conversation is active (`GameState.activeDialogue`), input is a choice number, not a parsed command; `help`/`restart` remain available as safety valves. `talk <npc>` starts the NPC's dialogue tree for the current scene if one exists, else falls back to a generic in-character line.
- **`ChallengeDef` is a key decision/skill-check moment — deliberately non-modal, unlike dialogue.** Every option is always shown together (never hidden-until-qualified — she needs to see the paths to choose between them), each optionally gated by the same `Requirement` used elsewhere. A gated option she doesn't qualify for is a real, recoverable failure (`failureText`, no effects, the challenge stays open so she can try a different option) — same philosophy as `ExitDef.requires`. There is no authored "Other": a bare number picks an option, but *any other input falls straight through to the normal room parser* (`processCommand` only intercepts pure numeric input while `activeChallengeId` is set), so trying her own idea always just works exactly like it would anywhere else — no special-casing needed. Two trigger shapes: room-scoped (`roomId` set — auto-activates on entry via `describeRoom`, auto-cancels, not resolves, if she leaves without picking) and roomless (the `startChallenge` effect, for decisions with no physical location, e.g. from a dialogue choice or an interactable). `GameState.resolvedChallenges` persists which ones are done (checkpointed); `activeChallengeId` is ephemeral like `activeDialogue` and always resets to `null` on restart.
- **NPC trust/honesty are live, not flavour text.** `GameState.npcState` is seeded from `campaign.ts`'s starting values and mutated via `adjustTrust`/`adjustHonesty` effects (clamped 0–100), the same way dialogue and other content already reference effects.
- **Decisions vs. flags:** plain yes/no facts stay in the existing `flags` (`StoryFlags`, boolean); a choice with a *value* (e.g. which friend Harper sent for help) goes in `GameState.decisions` (`Record<string, string>`) via the `setDecision` effect instead of being force-fit into a boolean.
- **Party membership** (`GameState.party`, `joinParty`/`leaveParty` effects) tracks which NPCs are currently with Harper. Available from Slice 2 onward for scene/dialogue text to reference; Slice 3's combat is expected to consume it too once built.
- **Combat is menu-driven** (numbered choices), not parsed free text — same reasoning as dialogue.
- **Items are explicitly tagged `essential` or `flavour` in their data definition.** Essential items have exactly one valid use and cannot be repurposed. Flavour items may have 0–4 hand-authored scene-specific `USE` outcomes; any `USE` attempt not specifically authored for the current scene must return a graceful, in-character non-broken fallback (never a generic error). This tagging and the fallback behavior are core engine contracts, not per-episode afterthoughts — build them into the engine from Slice 1 even though Episode 1 will only lightly exercise them.
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

**Acceptance criteria for Slice 1 — all verified (see Section 0):**
- [x] A new player can run the hero creator, get to Episode 1, play it start to finish using only the documented verb set, and reach the note cliffhanger.
- [x] Closing the browser and reopening resumes from the last scene checkpoint, with hero stats and inventory intact.
- [x] At least one item is tagged `essential` and at least one is tagged `flavour` with a couple of authored `USE` outcomes, demonstrating both paths work, including the non-broken fallback for an unauthored `USE`.
- [x] The caretaker (or equivalent) encounter can be evaded through more than one method (e.g. an item-based option and a pure command-based option).
- [x] Engine logic (parser, state transitions, save/load, item resolution) has Vitest coverage, written alongside the engine, not bolted on after.
- [x] `restart` correctly returns to the last scene checkpoint, not the very start of the episode.
- [x] `data/campaign.ts` and `data/episodes/episode1.ts` are genuinely separate files with a clean reference boundary — Episode 1's file should not redefine locations, NPCs, or stats that belong in the campaign file, and the campaign file should contain no Episode-1-specific scene content.

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

After Slice 1 is built — all steps below completed, see Section 0:
1. [x] Run `npm test` — all engine tests pass (54/54).
2. [x] Run `npm run dev`, play Episode 1 start to finish using only documented commands, confirm the cliffhanger note screen is reached.
3. [x] Reload the browser mid-episode (after at least one checkpoint) and confirm state resumes correctly (location, inventory, stats).
4. [x] Deliberately trigger the caretaker evasion encounter's failure path and confirm `restart` returns to the last scene checkpoint, not episode start.
5. [x] Attempt a `USE` on a flavour item in a scene where it has no authored outcome — confirm the fallback response is graceful and in-character, not an error or dead end.
6. [x] Confirm no network calls occur during gameplay (no AI API calls, no database calls) — this should be verifiable just by inspecting the code, since none should exist.

**For every episode from here on (including future passes over Episode 1), this list is superseded by the standing procedure in `docs/VERIFICATION_CHECKLIST.md`** — a full exploratory playthrough audit (every interactable, every phrasing, every failure path, not just the golden path), written up after this list proved too narrow: two separate audits of Episode 1 found seven real bugs invisible to the "correct path only" tests above.

---

## 8. Handling uncertainty

Before writing any code, restate your understanding of Slice 1's scope back to me in your own words, including your proposed scene-checkpoint breakdown for Episode 1 and your proposed hero-creator point-buy numbers, and wait for confirmation before proceeding.

If anything in Episode 1's content (beyond what's explicitly specified in this document and `docs/CAMPAIGN_BIBLE.md`) is ambiguous — dialogue phrasing, exact room layout, specific wording of the caretaker encounter — make a reasonable creative choice, clearly flag it as a placeholder/draft in a code comment, and keep moving; don't block on every content-level judgment call. But if anything about the **system/architecture** is ambiguous (how checkpoints are structured, how the essential/flavour item contract should be implemented, anything that would be expensive to change once Episode 2 depends on it), stop and ask rather than guessing.
