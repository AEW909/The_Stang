# The_Stang — Campaign Bible

> This is a **living document**, unlike `docs/SLICE1_HANDOFF.md` (a single-use engineering brief for the initial build). Every time a new Episode Brief is implemented, its "NEW CANON ADDITIONS" section should be folded into this document — specifically into the relevant table below — so this file always reflects the current, complete state of the campaign's canon. If this document and `data/campaign.ts` (the code) ever disagree, this document is the source of truth to reconcile the code against, not the other way around.

---

## Project brief (context)

A browser-based, 1980s-terminal-style text adventure game — green text on black, CRT aesthetic — built as a personal gift for a 10-year-old girl. Episodic narrative campaign (Season 1 is 8 episodes, extensible) blending exploration/parser gameplay, dialogue choices, light stat-based combat, and an NPC trust/relationship system. Tonal reference points: the Stranger Things animated series, Enola Holmes, Arcane, Wednesday, D&D, Kids on Bikes.

**Episode 1 premise (locked):** Harper wakes up alone in her school. The caretaker attacks her, looking "zombie-esque." She escapes and walks home through an eerily quiet town. She arrives home to find a note from her sister Camille — the episode's cliffhanger.

---

## Season 1 spine

The town is **Garstang**. The school's Headteacher, **Mrs Reeves**, is secretly the **Raven Queen**, able to plane-shift at will; everything else that crosses over comes through a fixed portal in her cabin, across the river in the woods.

**Motive:** The Raven Queen hoards mortal memories to sustain her physical form, and she's failing — visibly aging/growing ill as the season progresses, a clue to her desperation. She needs a memory of pure love and affection to secure herself. The Harper–Camille sibling bond is unusually strong, so she lured Camille specifically, knowing Harper would come for her. The "ritual" framing is a con — she doesn't actually need Camille for a ritual, she needs the sisters' bond itself.

**Camille's presence:** Not fully silent — she can call out to Harper across the planes as the season progresses. A doppelganger posing as Camille is a planned mid-season twist/trap; any "Camille" encountered before the Shadowfell should be treated as suspect.

**Endgame:** Harper reaches the Shadowfell and the sisters combine their bond/strength to defeat the Raven Queen — a "sisters find their power together" arc, not just a rescue.

**Tone/stakes standing rules:**
- Parents are explained-away/oblivious this season, Kids-on-Bikes/"big imagination" style. Liona (Mum) is explicitly reserved for a future season's escalation ("Mum steps in and kicks ass") — do not use her as an active Season 1 character beyond background/home-life presence.
- Friend danger is usually survivable (run away, get hurt) rather than fatal. Actual character death is reserved for cases the project owner explicitly designs, and should carry the same restart weight as a Harper death.
- Harper's own death is real and possible, restarting from the most recent scene checkpoint (not full episode restart).

---

## Locations

**ID convention:** lowercase snake_case, stable once assigned. Episode files reference these IDs; they must never change once an episode depends on them.

| ID | Name | Notes |
|---|---|---|
| `harpers_house` | Harper's house | Home base; Episode 1 ends here. |
| `school` | Garstang school | Episode 1 opens here. Mrs Reeves' domain. |
| `sports_complex` | Sports complex | Cricket, rugby, football, tennis facilities. |
| `high_street` | High street | Shops. |
| `supermarket` | Supermarket | |
| `library` | Library | Site of planned Raven Queen lore/research scene (Episode 3). |
| `grandmas_house` | Grandma's house | |
| `park` | Park | |
| `skate_park` | Skate park | |
| `river_walk` | Riverside walk | Statue-lined path along the river. |
| `raven_cabin` | The cabin | Across the river, in the woods. Site of the Raven Queen's portal. Not accessible until late-season (Episode 7+) — this restriction should be enforced in the campaign file, not left implicit. |

*Adjacency/connectivity between locations is not yet fully specified. A real map was mentioned as forthcoming from the project owner. Until then, only the connections a given episode actually needs should be defined — don't invent a full town layout speculatively.*

---

## NPC roster

| ID | Name | Physical description | Personality | Skill tag | Starting trust | Starting honesty | Notes |
|---|---|---|---|---|---|---|---|
| `ellie` | Ellie | Blonde, wavy hair; blue eyes; glasses (usually) | Mild-mannered, friendly, always polite, consistent | Reliable / Direct | High | High | Harper doesn't consciously realise it, but Ellie should read as *the* best friend of the group — the steadiest, most dependable presence. Worth treating as a real character thread across the season (something Harper might come to recognise), not just a flavour note. |
| `isabella` | Isabella | Shorter; pale; dark brown/black hair; slightly bulging eyes | Sly, sneaky, not always honest; stirs trouble between friends; secretly insecure underneath it | Cunning / Stealth | High | **Moderate, not high** | Her dishonesty is a real trait, not just "cunning" framing — it should occasionally cost her honesty stat specifically (separate from trust) even while Harper still likes and relies on her. This makes her the one friend whose stats can genuinely diverge, which is good texture for the trust/honesty system to actually mean something. Her insecurity is a seed for a redemption/deepening beat later in the season if wanted. |
| `akira` | Akira | Blonde, straight hair; glasses; round face | Very polite to adults; moody and dramatic with friends | Drama / Distraction | High | High | The "politeness gap" (charming to grown-ups, dramatic with peers) is worth using narratively — she might talk the group past an adult obstacle, or her drama could cause friction at a bad moment. |
| `joshua` | Joshua | Ginger, curly hair; short | Loud, funny, a bit naïve, loyal | Dependable / Physical | High | High | Harper's crush — mainly a crush subplot narratively, but loyalty should read as genuine; he steps in physically when it counts despite the naivety. |
| `camille` | Camille | — | — | — | N/A (family, not trust-gated) | — | Taken by the Raven Queen. Can call to Harper across the planes. Any "Camille" encountered before the Shadowfell should be treated as suspect (doppelganger risk). |
| `liona` | Liona (Mum) | — | — | — | N/A | — | Oblivious/explained-away for Season 1. Do not use as an active character beyond background/home-life presence — reserved for a future season. |
| `mrs_reeves` | Mrs Reeves | — | Likeable, normal-seeming (secretly the Raven Queen) | — | Neutral | Neutral | Only character who can plane-shift at will. Reads as trustworthy early; do not mechanically bias her trust value low from the start — the reveal should come through play, not stats. Shows visible signs of aging/illness as the season progresses. |
| `mr_dignan` | Mr Dignan | Tall; vampire-esque | "Too nice" | — | Neutral | Neutral | Deliberate red herring/sub-boss. Suspicion should emerge narratively, not be pre-loaded into his stats. |
| `mrs_russell` | Mrs Russell | — | — | — | Neutral | Neutral | Knowingly involved with the Raven Queen's plans. |
| `mr_wilkinson` | Mr Wilkinson | — | — | — | Neutral | Neutral | Suspects something's wrong; doesn't know the full extent. Possible ally — role clarifies around Episode 7. |
| `mrs_ayers` | Mrs Ayers | — | — | — | Neutral | Neutral | Retired abruptly; finding her unlocks scale of teacher involvement (Episode 5). **Needs further characterization before Episode 5 is planned in detail — currently purely functional, no personality/appearance defined yet.** |
| `caretaker` | The caretaker | — | — | — | Neutral | Neutral | Episode 1 evasion encounter, "zombie-esque." Backstory (not for Episode 1 exposition): saw Mrs Reeves doing something she shouldn't, and she did this to him. |

*(Numeric scale for trust/honesty — e.g. 0–100 with "High" ≈ 75, "Neutral" ≈ 50 — is an engine implementation detail, documented once in the code, not a narrative decision that needs re-deciding here.)*

**Player character:** Harper. Five stats — Bravery, Fight, Flight, Smarts, Charm — allocated via point-buy at hero creation (before Episode 1).

---

## Story-flag registry

This list should be treated as authoritative and extended — never forked. Before naming a new flag in an Episode Brief, check this table first; if a flag for that concept already exists, use it rather than creating a near-duplicate under a different name.

| Flag | Set by | Meaning |
|---|---|---|
| `camilleNoteFound` | Episode 1 | Harper has read Camille's note. |
| `caretakerEvaded` | Episode 1 | The Episode 1 evasion encounter was resolved. |
| `chasedFromPark` | Episode 1 | Harper found Camille's scarf on the swings in the park and was chased home by something in the trees (never confirmed as real). |
| `frontDoorsUnlocked` | Episode 1 | Temporary — true only in the window between pressing the reception release button and reaching the front doors. Cleared automatically if the player doesn't RUN there in time. |
| `hasMetEllie` / `hasMetIsabella` / `hasMetAkira` / `hasMetJoshua` | Episode 2 | Friend group introduced. |
| `dignanSuspected` | Episode 3 | Player suspicion has been directed at Dignan. |
| `mrsAyersFound` | Episode 5 | Mrs Ayers has been located. |
| `mrsRussellConfirmed` | Episode 5 | Mrs Russell's involvement confirmed. |
| `doppelgangerRevealed` | Episode 5 or 6 | The fake-Camille twist has landed. |
| `wilkinsonRoleClarified` | Episode 7 | Resolved as ally or too-late-to-help. |
| `portalDiscovered` | Episode 7 | The cabin/portal has been found. |

---

## Rough episode ladder (provisional — sketch, not locked)

Working titles throughout; swap in real titles when decided.

- **Episode 1 — locked.** School wake-up, caretaker evasion, quiet walk home, Camille's note.
- **Episode 2 — "The Empty Kitchen."** Opens directly from Episode 1's cliffhanger. Harper realises Camille isn't just out, she's missing. Friend group introduced (Ellie, Isabella, Akira, Joshua). First hints the adults' explanations don't add up.
- **Episode 3 — "Whispers at School."** Suspicion of teaching staff begins. Dignan planted hard as the obvious suspect. Mrs Ayers' abrupt retirement raised as a loose thread. Library scene — light meta beat researching Raven Queen mythology in-world.
- **Episode 4 — "First Crossing."** First real supernatural confrontation — a scout, a glimpse of the portal, or something that's come through it. Natural point for the first proper combat encounter.
- **Episode 5 — "Mrs Ayers."** Tracking her down reveals the real scale of teacher involvement; Mrs Russell's involvement confirmed. Doppelganger-Camille twist could land here or Episode 6.
- **Episode 6 — "Someone Gets Hurt."** Emotionally costliest episode so far — a friend in real danger. Trust/honesty stats should matter most here.
- **Episode 7 — "The Cabin."** Mrs Reeves fully unmasked. Portal discovered. Betrayal/final twist — likely where Mr Wilkinson's true role resolves.
- **Episode 8 — "The Shadowfell."** Harper crosses over for the final confrontation. Sisters combine their bond/power to defeat the Raven Queen. Costly-but-hopeful ending.

**Standing tone/mechanic notes for every future episode:**
- NPC selection (choosing who helps with what) should appear in *some* challenges, both combat and non-combat, but shouldn't become the dominant mechanic of every scene.
- Team-up moves (an NPC granting Harper's roll advantage/a bonus) should be limited and meaningful, not spammable every turn.
- Essential vs. flavour item logic applies across all episodes — every new item introduced anywhere must be tagged accordingly.

---

## Episode Brief template

Narrative planning happens in a separate "Story Room" conversation, not in a technical/build-focused one. Its output should conform to this template — this is what gets hand-carried to Claude Code for implementation.

```
EPISODE [number]: [working title]

PREREQUISITES
- Story-flags that must be set before this episode can start (or "none")

OPENING STATE
- Where/how the episode begins, referencing the prior episode's ending

SCENES
1. [Scene name] — [location, referencing existing campaign locations by name;
   flag clearly if this is a NEW location not yet in this bible]
   - What happens narratively
   - NPCs present (by name)
   - New items introduced, each tagged ESSENTIAL or FLAVOUR, with FLAVOUR
     items' authored USE outcomes listed
   - Choices/branches available to the player, and what they affect
   - Checkpoint: does this scene end a checkpoint boundary? (usually yes)
2. [Scene name] — ...
   (repeat per scene)

ENCOUNTERS
- Any evasion or combat encounters in this episode, what triggers them,
  and roughly how they should resolve (recoverable failure vs real stakes)

NPC INVOLVEMENT
- Which NPCs appear, any trust/honesty shifts their scenes should cause,
  any NPC-selection choices offered (who does the player bring/choose)

STORY-FLAGS
- Flags this episode READS (and how they change content if set/unset)
- Flags this episode WRITES (and what future episodes might use them for) —
  cross-check against the registry above before naming a new one

ENDING
- How the episode concludes — cliffhanger, resolved beat, or open transition
- What the player should feel arriving at the end

OPEN QUESTIONS / PLACEHOLDERS
- Anything deliberately left for Claude Code to make a small creative call on,
  or anything flagged as needing the project owner's direct input before
  implementation (e.g. exact dialogue wording, a specific joke, a note's
  contents)

NEW CANON ADDITIONS (if any)
- Any new locations, NPCs, or story-flags this episode introduces, listed
  separately and clearly so they can be folded into this bible's tables
  (and into data/campaign.ts) rather than existing only inside one
  episode's content
```

**Handoff instruction to Claude Code**, once a brief is ready: *"Here is the Episode Brief for Episode N. Implement it as `data/episodes/episodeN.ts` following the schema established in Episode 1 and the campaign/episode architecture in `docs/SLICE1_HANDOFF.md`. Reference existing campaign IDs where they already exist. If the brief's NEW CANON ADDITIONS section adds anything, apply those additions to both `data/campaign.ts` and this bible (`docs/CAMPAIGN_BIBLE.md`) in the same pass, so the two never drift out of sync. Before calling it done, run the full playthrough audit in `docs/VERIFICATION_CHECKLIST.md`."*
