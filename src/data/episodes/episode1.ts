// Episode 1 — self-contained content. References campaign IDs (locations,
// stats) but never redefines them. Adding Episode 2 should mean writing a
// new file, not editing this one or the engine.
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
            "You give it an experimental squeeze. A little puff of white dust startles a spider off the noticeboard. Rude, but effective, you suppose.",
        },
        {
          sceneId: "the_caretaker",
          result:
            "You heave the extinguisher up and pull the pin. It goes off with a roar, smothering the corridor in a choking white cloud. The caretaker lets out a groan like a dying vacuum cleaner and staggers sideways, clawing at the air. You don't wait to see what happens next — you run.",
          effects: [
            { type: "setFlag", flag: "caretakerEvaded", value: true },
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
            "You're lying on the classroom floor, cheek stuck to the carpet tiles. Your head throbs. The clock on the wall says 8:47, which feels wrong in a way you can't place yet. Sunlight comes through the blinds in stripes. The room is empty — no teacher, no class. There's a TEACHER'S DESK against the wall, a WINDOW on the far side, and a HAMSTER CAGE on the side table. Someone's stuck a POSTER to the DOOR, slightly askew. The door itself is shut.",
          interactables: [
            {
              id: "desk",
              name: "TEACHER'S DESK",
              examineText:
                "Mrs Reeves' desk. Suspiciously tidy, like always — except the drawer, which is open just a crack. Worth a closer look.",
            },
            {
              id: "drawer",
              name: "DESK DRAWER",
              examineText:
                "Inside, half-buried under a stack of spelling tests, is a small brass key.",
            },
            {
              id: "key",
              name: "BRASS KEY",
              examineText: "A small brass key, sitting in the open drawer.",
              takeable: true,
              itemId: "spare_key",
            },
            {
              id: "window",
              name: "WINDOW",
              examineText: "Painted shut sometime during a previous decade, probably. Not opening today.",
            },
            {
              id: "poster",
              name: "POSTER",
              examineText:
                "'Keep Calm and Carry On... Learning.' Someone's pencilled a moustache on the little crown. Bold.",
            },
            {
              id: "hamster_cage",
              name: "HAMSTER CAGE",
              examineText:
                "Empty. The tag reads 'MR NIBBLES.' There is no sign of Mr Nibbles. You choose not to think about that too hard.",
            },
          ],
          exits: [
            {
              aliases: ["door", "n"],
              targetRoomId: "corridor_1",
              locked: true,
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
            "The corridor outside is empty and colder than it should be. Fluorescent lights buzz along the ceiling — one of them dead. A NOTICE BOARD is pinned with flyers. Rows of LOCKERS line the wall. Someone's left a LOST PROPERTY BOX open on a bench. A FIRE EXTINGUISHER sits behind a cracked glass panel. Everything is exactly where it should be. That's somehow worse.",
          interactables: [
            {
              id: "noticeboard",
              name: "NOTICE BOARD",
              examineText:
                "A flyer for the Y6 bake sale ('NO NUTS PLEASE — ASK MR DIGNAN WHY'). Under it, someone's pinned a handwritten note: 'LOST: one (1) sense of normalcy. REWARD: mild relief.' You almost laugh. Almost.",
            },
            {
              id: "lockers",
              name: "LOCKERS",
              examineText:
                "Rows of grey lockers. Yours has the dent from the time Joshua tried to vault over them on a dare and did not, in fact, vault over them.",
            },
            {
              id: "lost_property",
              name: "LOST PROPERTY BOX",
              examineText:
                "A cardboard box of unclaimed sadness: one wellington boot, a retainer nobody's claimed in months, and — huh — half a sandwich, still wrapped.",
            },
            {
              id: "sandwich",
              name: "HALF-EATEN SANDWICH",
              examineText: "Egg and cress, by the smell. Someone's initials are on the wrapper. Not yours.",
              takeable: true,
              itemId: "half_sandwich",
            },
            {
              id: "extinguisher",
              name: "FIRE EXTINGUISHER",
              examineText:
                "Behind a little glass panel marked 'IN CASE OF EMERGENCY — BREAK GLASS.' No hammer needed; the panel's already cracked.",
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
            "You round the corner and stop dead. The CARETAKER is standing at the far end of the corridor, back to you, swaying slightly, like he's listening to music only he can hear. Except there's no music. His overalls are stained dark in a way you don't want to think about. A SUPPLY CLOSET door is ajar just beside you. The only way FORWARD is past him.",
          interactables: [
            {
              id: "caretaker",
              name: "CARETAKER",
              examineText:
                "He hasn't turned around. You can hear him breathing — a wet, rattling sound that doesn't feel entirely human. You should not get closer.",
            },
            {
              id: "closet",
              name: "SUPPLY CLOSET",
              examineText: "Mops, buckets, the smell of bleach. Small, but you'd fit. Probably.",
            },
          ],
          exits: [
            {
              aliases: ["closet", "supply closet"],
              targetRoomId: "corridor_3",
              onSuccess: [{ type: "setFlag", flag: "caretakerEvaded", value: true }],
            },
            {
              aliases: ["forward", "e"],
              targetRoomId: "corridor_3",
              locked: true,
              requiresFlag: "caretakerEvaded",
              lockedText:
                "You bolt for the gap past him — but he's faster than he looks. A cold, damp hand closes around your sleeve for one horrible second before you wrench free and stumble back where you started, heart slamming. He hasn't even turned around. Somehow that's worse. You need another way past him.",
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
            "The school reception is unmanned. The SIGN-IN BOOK is open on the desk. A cork board is covered in cheerful posters about half-term clubs that suddenly feel very far away.",
          interactables: [
            {
              id: "sign_in_book",
              name: "SIGN-IN BOOK",
              examineText:
                "Rows and rows of names, all present, all accounted for. Except you're the only person you've actually seen all morning.",
            },
          ],
          exits: [{ aliases: ["forward", "e"], targetRoomId: "front_doors" }],
        },
        {
          id: "front_doors",
          name: "Front Doors",
          locationId: "school",
          description:
            "The double doors at the front of the school stand open, swinging slightly in a breeze that shouldn't be indoors. Through them: daylight, and the ordinary, empty shape of the school car park.",
          interactables: [],
          exits: [{ aliases: ["out", "forward", "e"], targetRoomId: "high_street_room" }],
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
            "The high street is quiet in a way that has nothing to do with what day it is. Shop signs hang still. The NEWSAGENT'S door is propped open, a radio murmuring to no one. A couple of PARKED CARS sit at odd angles, like their drivers just... stopped.",
          interactables: [
            {
              id: "newsagent",
              name: "NEWSAGENT'S",
              examineText:
                "Rows of chocolate bars, undisturbed. The radio's playing something with strings. No one's manning the till, but the till drawer's open.",
            },
            {
              id: "parked_cars",
              name: "PARKED CARS",
              examineText:
                "Nothing wrong with them, technically. Just parked like whoever was driving changed their mind halfway through parking.",
            },
          ],
          exits: [{ aliases: ["forward", "e"], targetRoomId: "park_room" }],
        },
        {
          id: "park_room",
          name: "The Park",
          locationId: "park",
          description:
            "The park's SWINGS move gently, though there's no wind to speak of. No one's here — no dog walkers, no toddlers, no pensioners on the BENCH that's usually full of them.",
          interactables: [
            {
              id: "swings",
              name: "SWINGS",
              examineText: "Empty, swinging in lazy little arcs. You watch them for a second too long.",
            },
            {
              id: "bench",
              name: "BENCH",
              examineText:
                "A brass plaque reads 'IN MEMORY OF BARRY, WHO LOVED THIS BENCH.' Barry, if you're out there, this is a lot right now.",
            },
          ],
          exits: [{ aliases: ["home", "forward", "e"], targetRoomId: "front_garden" }],
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
            "Your street looks normal, which almost makes it worse. Your house is right where you left it. The DOORMAT by the front DOOR reads 'LIVE, LAUGH, LOVE' in your mum's least ironic handwriting.",
          interactables: [
            {
              id: "doormat",
              name: "DOORMAT",
              examineText: "'Live, Laugh, Love.' You have never related to a doormat less.",
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
