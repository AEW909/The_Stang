// Episode 1 — self-contained content. References campaign IDs (locations,
// stats) but never redefines them. Adding Episode 2 should mean writing a
// new file, not editing this one or the engine.
//
// Room descriptions are deliberately lean: they set atmosphere and mention
// exits/NPCs/plot objects, but never name ordinary props directly. Every
// prop gets a `shortDescription`, and the engine appends a "You can also
// see" line built from whichever interactables are currently revealed and
// not yet taken (see describeRoom in src/engine/commands.ts). This keeps
// room text and room data from drifting apart as more episodes are added.
//
// DRAFT/PLACEHOLDER CONTENT: room descriptions, comedic asides, and
// especially Camille's note (see the `hallway` room and `endingText` below)
// are reasonable creative choices made to fill the brief, not locked canon.
// The project owner may want to hand-write the note specifically.

import type { EpisodeDef } from "../../engine/types";

export const episode1: EpisodeDef = {
  id: "episode1",
  number: 1,
  title: "Episode 1: The Walk Home",
  prerequisites: [],
  startSceneId: "waking_up",
  // No NPC dialogue in Episode 1 — Harper is alone throughout (see docs/SLICE1_HANDOFF.md
  // Section 4). The dialogue/trust/party engine exists from Slice 2 onward; Episode 2 is
  // the first to actually populate this array.
  dialogues: [],
  // Same story: the caretaker/park/front-doors moments predate the ChallengeDef
  // primitive and were deliberately left as their existing exit-based
  // implementations rather than retrofitted. Episode 2+ is where this gets used.
  challenges: [],
  items: [
    {
      id: "spare_key",
      name: "BRASS KEY",
      description:
        "A small brass key, labelled in tiny handwriting: 'SPARE — DO NOT LOSE (Mrs Reeves will know).'",
      tag: "essential",
      takeText:
        "You pocket the key. It's labelled, in tiny handwriting: 'SPARE — DO NOT LOSE (Mrs Reeves will know).' You believe it.",
      essentialUse: {
        targetId: "door",
        result: "The key turns with a satisfying clunk. The door swings open.",
        effects: [{ type: "goTo", roomId: "corridor_1" }],
      },
      wrongUseText: "The key doesn't fit anything here. Best save it for the classroom door.",
    },
    {
      id: "fire_extinguisher",
      name: "FIRE EXTINGUISHER",
      description: "A heavy red fire extinguisher, pin still in.",
      tag: "flavour",
      takeText:
        "You wrestle it free. It's heavier than it looks, and it smells faintly of dust and other people's emergencies.",
      flavourUses: [
        {
          sceneId: "waking_up",
          result:
            "You give it an experimental squeeze. A little puff of white dust drifts out and something small skitters for cover nearby. Rude, but effective, you suppose.",
        },
        {
          sceneId: "the_caretaker",
          result:
            "You heave the extinguisher up and pull the pin. It goes off with a roar, smothering the corridor in a choking white cloud, empty in seconds. The caretaker lets out a groan like a dying vacuum cleaner and staggers sideways, clawing at the air. You don't wait to see what happens next — you drop the spent canister and run.",
          effects: [
            { type: "setFlag", flag: "caretakerEvaded", value: true },
            { type: "removeItem", itemId: "fire_extinguisher" },
            { type: "goTo", roomId: "corridor_3" },
          ],
        },
      ],
      fallbackUseText: "This doesn't feel like the moment for a fire drill. You hang onto it, just in case.",
    },
    {
      id: "half_sandwich",
      name: "HALF-EATEN SANDWICH",
      description: "Egg and cress, by the smell. Or the ghost of egg and cress.",
      tag: "flavour",
      takeText: "You take it. You don't know why. You just do.",
      flavourUses: [],
      fallbackUseText: "You consider eating it. You reconsider immediately. Some mysteries are better left wrapped.",
    },
    {
      id: "camilles_scarf",
      name: "SCARF",
      description: "A stripy scarf. Camille's. You're not leaving it behind.",
      tag: "flavour",
      takeText:
        "You unhook it carefully. It's definitely hers — you can still smell her shampoo on it, faint but unmistakable. Then a branch snaps somewhere in the trees behind you. Not wind. You don't wait to find out what it was.",
      flavourUses: [],
      fallbackUseText: "You hold onto it. It's hers. That's all that matters right now.",
    },
  ],
  scenes: [
    {
      id: "waking_up",
      title: "Waking Up",
      startRoomId: "classroom",
      rooms: [
        {
          id: "classroom",
          name: "Classroom",
          locationId: "school",
          description:
            "You're lying on the classroom floor, cheek stuck to the carpet tiles. Your head throbs. The clock on the wall says 8:47, which feels wrong in a way you can't place yet. Sunlight comes through the blinds in stripes. The room is empty — no teacher, no class. The DOOR is shut.",
          interactables: [
            {
              id: "desk",
              name: "TEACHER'S DESK",
              examineText:
                "Mrs Reeves' desk. Suspiciously tidy, like always — except the drawer, which doesn't look properly shut. Worth a closer look.",
              shortDescription: "A TEACHER'S DESK sits against the wall.",
            },
            {
              id: "drawer",
              name: "DESK DRAWER",
              examineText: "The desk's drawer. It's shut.",
              openExamineText:
                "Inside, half-buried under a stack of spelling tests, is a small brass key.",
              shortDescription: "Its DESK DRAWER doesn't look properly shut.",
              openShortDescription: "The DESK DRAWER hangs open, something glinting inside.",
              openable: true,
              openText: "You tug the drawer open. Something glints inside — a key.",
              closeText: "You push the drawer shut.",
            },
            {
              id: "key",
              name: "BRASS KEY",
              examineText: "A small brass key.",
              shortDescription: "A small BRASS KEY sits in the open drawer.",
              containedIn: "drawer",
              takeable: true,
              itemId: "spare_key",
            },
            {
              id: "window",
              name: "WINDOW",
              examineText: "Painted shut sometime during a previous decade, probably. Not opening today.",
              shortDescription: "A WINDOW looks out over the empty playground.",
            },
            {
              id: "poster",
              name: "POSTER",
              examineText:
                "'Keep Calm and Carry On... Learning.' Someone's pencilled a moustache on the little crown. Bold.",
              shortDescription: "A POSTER hangs slightly askew by the door.",
            },
            {
              id: "hamster_cage",
              name: "HAMSTER CAGE",
              examineText:
                "Empty. The tag reads 'MR NIBBLES.' There is no sign of Mr Nibbles. You choose not to think about that too hard.",
              shortDescription: "An empty HAMSTER CAGE sits on the side table.",
            },
          ],
          exits: [
            {
              aliases: ["door", "n"],
              targetRoomId: "corridor_1",
              unlocksWithItemId: "spare_key",
              lockedText:
                "The handle turns but the door doesn't budge. Locked. Weird — classrooms don't usually lock from this side.",
            },
          ],
        },
        {
          id: "corridor_1",
          name: "School Corridor",
          locationId: "school",
          description:
            "The corridor outside is empty and colder than it should be. Fluorescent lights buzz along the ceiling — one of them dead. Everything is exactly where it should be. That's somehow worse.",
          interactables: [
            {
              id: "noticeboard",
              name: "NOTICE BOARD",
              examineText:
                "A flyer for the Y6 bake sale ('NO NUTS PLEASE — ASK MR DIGNAN WHY'). Under it, someone's pinned a handwritten note: 'LOST: one (1) sense of normalcy. REWARD: mild relief.' You almost laugh. Almost.",
              shortDescription: "A NOTICE BOARD is pinned with flyers.",
            },
            {
              id: "lockers",
              name: "LOCKERS",
              examineText:
                "Rows of grey lockers. Yours has the dent from the time Joshua tried to vault over them on a dare and did not, in fact, vault over them.",
              shortDescription: "Rows of grey LOCKERS line the wall.",
            },
            {
              id: "lost_property",
              name: "LOST PROPERTY BOX",
              examineText: "A cardboard box of unclaimed sadness. The lid's closed.",
              openExamineText:
                "Inside: one wellington boot, a retainer nobody's claimed in months, and — huh — half a sandwich, still wrapped.",
              shortDescription: "A LOST PROPERTY BOX sits on the bench, lid closed.",
              openShortDescription: "The LOST PROPERTY BOX sits open on the bench.",
              openable: true,
              openText:
                "You lift the lid. Unclaimed sadness awaits: one wellington boot, a retainer nobody's claimed in months, and — huh — half a sandwich, still wrapped.",
              closeText: "You put the lid back on. Probably wise.",
            },
            {
              id: "sandwich",
              name: "HALF-EATEN SANDWICH",
              examineText: "Egg and cress, by the smell. Someone's initials are on the wrapper. Not yours.",
              shortDescription: "A HALF-EATEN SANDWICH sits among the lost property.",
              containedIn: "lost_property",
              takeable: true,
              itemId: "half_sandwich",
            },
            {
              id: "extinguisher",
              name: "FIRE EXTINGUISHER",
              examineText:
                "Behind a little glass panel marked 'IN CASE OF EMERGENCY — BREAK GLASS.' No hammer needed; the panel's already cracked.",
              shortDescription: "A FIRE EXTINGUISHER sits behind a cracked glass panel.",
              takeable: true,
              itemId: "fire_extinguisher",
            },
          ],
          exits: [
            { aliases: ["forward", "e"], targetRoomId: "corridor_2" },
            { aliases: ["back", "w"], targetRoomId: "classroom" },
          ],
        },
      ],
    },
    {
      id: "the_caretaker",
      title: "The Caretaker",
      startRoomId: "corridor_2",
      rooms: [
        {
          id: "corridor_2",
          name: "School Corridor — Caretaker",
          locationId: "school",
          description:
            "You round the corner and stop dead. The CARETAKER is standing at the far end of the corridor, back to you, swaying slightly, like he's listening to music only he can hear. Except there's no music. His overalls are stained dark in a way you don't want to think about. A SUPPLY CLOSET door is ajar just beside you. Your mind races through every option — hide, fight, run, or just get out of here the way you came.",
          interactables: [
            {
              id: "caretaker",
              name: "CARETAKER",
              examineText:
                "He hasn't turned around. You can hear him breathing — a wet, rattling sound that doesn't feel entirely human. You should not get closer.",
              excludeFromList: true,
            },
            {
              id: "closet",
              name: "SUPPLY CLOSET",
              examineText: "Mops, buckets, the smell of bleach. Small, but you'd fit. Probably.",
              excludeFromList: true,
            },
          ],
          exits: [
            {
              aliases: ["closet", "supply closet", "hide"],
              targetRoomId: "corridor_3",
              successText:
                "You duck into the supply closet and ease the door almost shut, heart slamming against your ribs. Through the gap you watch him shuffle past, moaning like a broken hinge, and turn the corner out of sight. When the corridor's silent again, you slip out and hurry on.",
              onSuccess: [{ type: "setFlag", flag: "caretakerEvaded", value: true }],
            },
            {
              aliases: ["push", "push past"],
              targetRoomId: "corridor_3",
              requires: { stat: "fight", min: 7 },
              successText:
                "You put your head down and barrel past him before he can react, shoulder-checking him into the lockers. He lets out a wet groan behind you, but you're already gone.",
              onSuccess: [{ type: "setFlag", flag: "caretakerEvaded", value: true }],
              lockedText:
                "You try to force your way past — but he's stronger than he looks. He shoves back hard and you stumble away, narrowly avoiding those groping hands. That didn't work. You need another way past him.",
            },
            {
              aliases: ["dodge", "dodge past"],
              targetRoomId: "corridor_3",
              requires: { stat: "flight", min: 7 },
              successText:
                "You wait for a gap in his swaying and dart past on light feet, quick as anything. He doesn't even seem to notice you're gone.",
              onSuccess: [{ type: "setFlag", flag: "caretakerEvaded", value: true }],
              lockedText:
                "You wait for a gap and try to dart past — but you misjudge the distance and he lurches sideways, cutting you off. You scramble back before he can grab you. Too slow. You need another way past him.",
            },
            {
              aliases: ["forward", "e"],
              targetRoomId: "corridor_3",
              requiresFlag: "caretakerEvaded",
              lockedText:
                "You bolt for the gap past him — but he's faster than he looks. A cold, damp hand closes around your sleeve for one horrible second before you wrench free and stumble back where you started, heart slamming. He hasn't even turned around. Somehow that's worse. You need another way past him.",
            },
            {
              aliases: ["back", "w", "retreat"],
              targetRoomId: "corridor_1",
              successText: "You back away slowly, not taking your eyes off him, and duck back the way you came.",
            },
          ],
        },
      ],
    },
    {
      id: "escape_school",
      title: "Escape the School",
      startRoomId: "corridor_3",
      rooms: [
        {
          id: "corridor_3",
          name: "School Corridor",
          locationId: "school",
          description:
            "Your heart's still going a mile a minute, but the corridor ahead is empty and, for once, blessedly ordinary. Somewhere behind you a radiator clanks, almost like it's applauding. You don't wait around to find out why.",
          interactables: [],
          exits: [{ aliases: ["forward", "e"], targetRoomId: "reception" }],
        },
        {
          id: "reception",
          name: "School Reception",
          locationId: "school",
          description:
            "The school reception is unmanned. A cork board is covered in cheerful posters about half-term clubs that suddenly feel very far away.",
          interactables: [
            {
              id: "sign_in_book",
              name: "SIGN-IN BOOK",
              examineText:
                "Rows and rows of names, all present, all accounted for. Except you're the only person you've actually seen all morning.",
              shortDescription: "The SIGN-IN BOOK lies open on the desk.",
            },
            {
              id: "desk",
              name: "RECEPTION DESK",
              examineText:
                "The reception desk, sign-in book still open on top. Tucked underneath, out of sight unless you're looking for it, is a small red BUTTON.",
              shortDescription: "A RECEPTION DESK sits by the door.",
            },
            {
              id: "button",
              name: "BUTTON",
              examineText:
                "A small red button, dusty with disuse. No label. There's exactly one way to find out what it does.",
              shortDescription: "A small red BUTTON is fitted underneath the desk.",
              onUseEffects: [{ type: "setFlag", flag: "frontDoorsUnlocked", value: true }],
              useText: "You press it. Somewhere near the front doors, something clunks and releases. You'd better hurry — run.",
            },
          ],
          exits: [{ aliases: ["forward", "e"], targetRoomId: "front_doors" }],
        },
        {
          id: "front_doors",
          name: "Front Doors",
          locationId: "school",
          description:
            "The double doors at the front of the school are shut fast, a heavy release mechanism gleaming beside the frame. Through the glass: daylight, and the ordinary, empty shape of the school car park, further away than it's ever felt.",
          interactables: [],
          exits: [
            {
              aliases: ["out", "forward", "e", "door", "doors"],
              targetRoomId: "high_street_room",
              requiresFlag: "frontDoorsUnlocked",
              requiresRun: true,
              lockedText:
                "You push at the doors, but they don't budge. Locked tight. There must be a release somewhere — try the reception desk, back the way you came.",
              wrongRunText:
                "The doors are unlocked — but not for long. You're not fast enough this time; you hear the lock clunk back into place behind the panic bar. Better hit that button again.",
              successText:
                "You shove through the doors just as the mechanism clunks again behind you, and stumble out into the daylight.",
            },
            { aliases: ["back", "w"], targetRoomId: "reception" },
          ],
        },
      ],
    },
    {
      id: "walk_home",
      title: "The Quiet Walk Home",
      startRoomId: "high_street_room",
      rooms: [
        {
          id: "high_street_room",
          name: "High Street",
          locationId: "high_street",
          description:
            "The high street is quiet in a way that has nothing to do with what day it is. Shop signs hang still.",
          interactables: [
            {
              id: "newsagent",
              name: "NEWSAGENT'S",
              examineText:
                "Rows of chocolate bars, undisturbed. The radio's playing something with strings. No one's manning the till, but the till drawer's open.",
              shortDescription: "The NEWSAGENT'S door is propped open, a radio murmuring to no one.",
            },
            {
              id: "parked_cars",
              name: "PARKED CARS",
              examineText:
                "Nothing wrong with them, technically. Just parked like whoever was driving changed their mind halfway through parking.",
              shortDescription: "A couple of PARKED CARS sit at odd angles on the street.",
            },
          ],
          exits: [{ aliases: ["forward", "e"], targetRoomId: "park_room" }],
        },
        {
          id: "park_room",
          name: "The Park",
          locationId: "park",
          description: "The park is still and a little too quiet. No one's here — no dog walkers, no toddlers.",
          interactables: [
            {
              id: "swings",
              name: "SWINGS",
              examineText: "Empty, swinging in lazy little arcs. You watch them for a second too long.",
              shortDescription: "The SWINGS move gently, though there's no wind to speak of.",
            },
            {
              id: "bench",
              name: "BENCH",
              examineText:
                "A brass plaque reads 'IN MEMORY OF BARRY, WHO LOVED THIS BENCH.' Barry, if you're out there, this is a lot right now.",
              shortDescription: "A BENCH sits empty, usually full of pensioners at this hour.",
            },
            {
              id: "scarf",
              name: "SCARF",
              examineText:
                "It's caught on one of the swing's chains, fluttering slightly. You'd know that stripy pattern anywhere — it's Camille's. She never goes anywhere without it.",
              shortDescription: "A SCARF is caught on one of the swing's chains.",
              takeable: true,
              itemId: "camilles_scarf",
              onTakeEffects: [{ type: "setFlag", flag: "chasedFromPark", value: true }],
            },
          ],
          exits: [
            {
              aliases: ["home", "forward", "e"],
              targetRoomId: "front_garden",
              successText: "You head for home, the park falling quiet behind you.",
              alternateSuccessText: {
                flag: "chasedFromPark",
                text: "You don't walk the rest of the way — you run, the scarf balled in your fist, and don't stop until your own front door is in reach, chest heaving.",
              },
            },
          ],
        },
      ],
    },
    {
      id: "home",
      title: "Home",
      startRoomId: "front_garden",
      rooms: [
        {
          id: "front_garden",
          name: "Front Garden",
          locationId: "harpers_house",
          description:
            "Your street looks normal, which almost makes it worse. Your house is right where you left it. The front DOOR is shut.",
          interactables: [
            {
              id: "doormat",
              name: "DOORMAT",
              examineText: "'Live, Laugh, Love.' You have never related to a doormat less.",
              shortDescription: "A DOORMAT by the front door reads 'LIVE, LAUGH, LOVE.'",
            },
          ],
          exits: [{ aliases: ["door", "forward", "e"], targetRoomId: "hallway" }],
        },
        {
          id: "hallway",
          name: "Hallway",
          locationId: "harpers_house",
          description:
            "The house is silent. No telly, no radio, no Mum humming off-key in the kitchen. On the kitchen table, propped against the fruit bowl, is a folded NOTE with your name on it, in Camille's handwriting.",
          interactables: [
            {
              id: "note",
              name: "NOTE",
              examineText:
                "Harper —\n\nI had to go. I can't explain it properly here, and I don't think you'd believe me if I tried. Please don't come looking. I promise I'll explain everything when I can.\n\nI love you. Stay safe.\n\n— Camille\n\n[DRAFT — placeholder note content, flagged for the project owner to hand-write.]",
              excludeFromList: true,
              onExamineEffects: [
                { type: "setFlag", flag: "camilleNoteFound", value: true },
                { type: "endEpisode" },
              ],
            },
          ],
          exits: [],
        },
      ],
    },
  ],
  endingText:
    "You read it twice. Then a third time, like the words might rearrange themselves into something that makes more sense.\n\nThey don't.\n\nCamille is gone, and something about this whole too-quiet day tells you it isn't as simple as her deciding to leave.\n\n— END OF EPISODE 1 —\n\n(Camille's note above is a draft placeholder — flagged for the project owner to hand-write its real contents.)",
};
