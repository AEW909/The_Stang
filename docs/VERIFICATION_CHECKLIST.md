# The_Stang — Episode/Slice Verification Checklist

> This is a living, standing procedure — not specific to one episode. Run it for every new episode's content and every change to a shared engine mechanic, before marking anything "shippable" in `docs/SLICE1_HANDOFF.md`'s status log. It exists because Episode 1 proved, twice, that real bugs hide in exactly the places an automated test suite doesn't look: natural phrasing nobody thought to test, narration that assumes a specific room within a multi-room scene, and states nobody deliberately tried to reach (retreating, retrying, backtracking).

---

## Why this exists

The Vitest suite only ever exercises the commands its author thought to write — which are almost always the "correct," expected ones. Two full-playthrough audits of Episode 1 found seven real issues that 73–86 passing tests had completely missed, because every one of those tests typed the "right" word in the "right" order. A manual (well — engine-driven, systematically exhaustive) playthrough is the only thing that catches:

- Phrasing a real player would use that the parser doesn't recognise.
- Content that's correct in the room it was written for but wrong in a second room the same scene also covers.
- Narration that implies a one-time event but replays every time an action repeats.
- States nobody remembered to test: retreating, retrying after failure, re-entering a room, using an item outside its intended moment.

Treat every finding as either **fixed** (with a permanent regression test) or **explicitly noted and deferred** (with a one-line reason) — never silently ignored.

---

## Method: two passes, not one

1. **Engine-driven pass (exhaustive, do this first).** Write a temporary Vitest file that drives `processCommand` directly against the real campaign + episode data — no UI needed. This is fast enough to try every phrasing variant of every interaction without it costing real time. **Delete this file when you're done with it.** Only the regression tests for confirmed findings should survive into the permanent suite (e.g. `commands.test.ts`, `dialogue.test.ts`); a temporary exploration script has no business being committed.
2. **Browser pass (spot-check, do this second).** Use the preview tools to actually play a few of the same paths for real — this is where you catch things the engine-level text output won't show you: suggestions-bar accuracy, CRT rendering, whether the terminal scrolls sensibly, whether a screenshot looks right. Don't try to re-run the full exhaustive list here; just confirm the headline findings and the golden path.

---

## What to exercise

For a new episode, run all of these. For a change to a shared engine mechanic (e.g. the dialogue system, the item contract), re-run whichever of these apply to every episode that mechanic touches — which today means at least Episode 1.

1. **The golden path.** Play start to finish using only the "obvious" documented commands. This should already be covered by an automated test, but replay it anyway — it's the cheapest sanity check there is.
2. **Every interactable, in every room, examined multiple ways:** bare name, id, full name, `the`/`a`/`an` prefixed, and — for anything behind a container — both before and after that container is opened. Compare what you get against what the room's `shortDescription`/footer claims is there.
3. **Every exit, from every room:** each alias, a wrong direction, a locked exit before and after its unlock condition is met, and — critically — try walking backward into a room you've already left. Does anything about the destination or the checkpoint look wrong given you've been there before?
4. **Every item:** take it, drop it, examine it (in and out of inventory), `use` it in every scene it has an authored outcome for, and `use` it somewhere it doesn't. If it's essential, try it on the wrong target. If it's meant to be consumed by a specific action, confirm it's actually gone afterward (not still sitting in inventory usable again).
5. **Every encounter/evasion path:** every success method, every failure method, retry after a failure, and — if a retreat option exists — retreat, do something else, then come back and try again. Confirm failure is recoverable and success is properly narrated (don't let a threat just vanish with no explanation of what happened to it).
6. **Every dialogue tree, once relevant:** every choice at every node, gated choices both before and after their `requires` threshold is met, a choice that ends the conversation, and a choice that continues it. Confirm `help`/`restart` still work mid-conversation, and confirm a node never has only gated choices (this should also be caught by `validateDialogueTree`, but check it manually too).
7. **Checkpoints and save, deliberately abused:** reload mid-episode after at least one checkpoint; fail an encounter and `restart`; succeed and then `restart` (should never undo a completed success); and if any room allows backward travel across a scene boundary, confirm the checkpoint didn't regress.
8. **Edge cases and nonsense input:** empty input, gibberish, a verb with no target, examining/taking something not present, using an item you don't have, talking with no one around. Every one of these should produce a graceful in-character or plain instructional message — never a crash, never a generic error.
9. **Cross-room consistency for scene-scoped content.** If a flavour outcome, dialogue tree, or other content is scoped to a *scene* rather than a single *room*, and that scene spans more than one room, trigger it from every room in that scene. Content authored with one specific room in mind (a joke that names a fixture, a threat that's only physically present in one room) will read wrong from the others.
10. **Repetition.** Any action a player can repeat (walking back and forth through a door, re-entering a room, retrying an encounter) should be checked twice. If the first pass narrates something as a discrete event ("the key turns," "he staggers back"), the second pass should not imply it's happening again from scratch unless it actually should.
11. **Natural phrasing over exact phrasing.** Don't just type what the suggestions bar shows — type what a real (young) player would type: with articles, with prepositions ("go into," "walk through"), with synonyms ("grab" instead of "take," "look at" instead of "examine"). If it reads naturally to a person, the parser should probably accept it.
12. **Pacing/obstacle cadence — read the room count, not just each room individually.** Map out the episode as a sequence of rooms and mark which ones have an actual obstacle, choice, or challenge (not just flavour text to examine and move past). **A stretch of more than 3–4 consecutive rooms with nothing to actually *do* is a pacing problem, even if every individual room is well-written and bug-free.** This is easy to miss because each room passes every other check on this list — the issue only shows up when you look at the episode as a whole sequence. If you find a gap like this, don't invent content to fill it yourself (per `docs/SLICE1_HANDOFF.md` Section 8, scene beats not covered by the brief or the campaign bible need the project owner's sign-off) — flag it and propose 2–3 concrete, lightweight options for what could go there.
    - There's an automated first pass for this now: `auditPacing()` in `engine/pacingAudit.ts` walks an episode's real room graph and flags any stretch longer than the guideline. It's a cheap, mechanical proxy — a room counts as an "obstacle" if an exit is gated, or if an interactable's `onTakeEffects`/`onExamineEffects` sets a flag, records a decision, or otherwise changes story state. Run it (or add an assertion for it, as `engine/pacing.test.ts` does for Episode 1) before doing the manual read — but the manual read still matters, because this only proves *something happens*, not that it's any good.

---

## Severity triage: fix now vs. note and defer

**Fix now** if the issue:
- Blocks or appears to block progress (even if there's a workaround the player might not find).
- Silently gives the player wrong information about the game's state (a threat that's gone but shouldn't be, an item that's still usable but shouldn't be).
- Is systemic — it affects more than one spot, so leaving it means it'll resurface in every future episode (e.g. the article-blindness fix touched every interaction in the game).
- Is cheap and low-risk to fix relative to its impact.

**Note and defer** if the issue:
- Is purely cosmetic (a repeated line of flavour text, a slightly awkward but harmless phrasing gap).
- Would require disproportionate new engine complexity for a small, judgment-call payoff (e.g. full NLP-style preposition/synonym coverage beyond the common cases).
- Is a narrative/design decision that belongs to the project owner, not an engineering call (e.g. "should this item be reusable?").

Every deferred item must be written down with a one-line reason, not just silently dropped — see `docs/SLICE1_HANDOFF.md` Section 0 for the running log of what's been fixed vs. explicitly deferred and why.

---

## Reporting format

Report findings as two short lists, most important first:

- **Fixed:** what was wrong, what changed, and (implicitly, via the new tests) how it's now covered.
- **Noted, not fixed:** what was wrong and why it wasn't worth fixing right now.

Then confirm: all tests passing, `tsc` clean, temporary exploration files deleted, and (for anything UI-visible) a browser spot-check done.

---

## Regression coverage is mandatory

Every confirmed, fixed finding gets a permanent automated test before the episode is called done — the point of this whole exercise is that these bugs should never come back silently. A finding without a regression test is not actually fixed, it's just fixed *today*.
