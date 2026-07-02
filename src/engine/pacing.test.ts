import { describe, expect, it } from "vitest";
import { episode1 } from "../data/episodes/episode1";
import { auditPacing } from "./pacingAudit";

// See docs/VERIFICATION_CHECKLIST.md item 12: more than 3-4 consecutive
// rooms with nothing to actually do is a pacing problem, even if every
// individual room is otherwise correct. This is a cheap automated first
// pass, not a substitute for the manual judgement call on whether an
// obstacle is any good — but it does catch a stretch of dead rooms reliably,
// which is exactly what slipped through the original Episode 1 content.
const MAX_ALLOWED_GAP = 4;

describe("pacing audit — obstacle cadence", () => {
  it("keeps Episode 1's longest obstacle-free stretch within the guideline", () => {
    const { report, maxGap } = auditPacing(episode1);
    console.log(report.join("\n"));
    console.log(`\nLongest stretch with no obstacle: ${maxGap} consecutive rooms (max allowed: ${MAX_ALLOWED_GAP}).`);
    expect(maxGap).toBeLessThanOrEqual(MAX_ALLOWED_GAP);
  });
});
