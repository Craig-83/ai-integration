import { SEED_HISTORY, toCsv, whoWasOnSite, withinRetention } from "../history";
import { manualRoster } from "../scenarios";

describe("history", () => {
  it("drops entries outside the retention window and keeps 7 years by default", () => {
    const all = withinRetention(SEED_HISTORY, 84, "2026-11-02");
    const year = withinRetention(SEED_HISTORY, 12, "2026-11-02");
    expect(all).toHaveLength(SEED_HISTORY.length);
    expect(year.length).toBeLessThan(all.length);
    expect(year.every((e) => e.at >= "2025-11-02")).toBe(true);
  });

  it("records who was on a shift and flags a lapsed clearance", () => {
    // The hand-built roster puts Ben (NV1 lapsed 1 Oct) on Thursday's Cyber Office shift
    const people = whoWasOnSite(manualRoster(), "ccco-3-1800");
    const ben = people.find((p) => p.staffId === "ben");
    expect(ben?.ok).toBe(false);
    expect(ben?.checks).toContain("NV1 expired");
    expect(people.some((p) => p.ok)).toBe(true);
  });

  it("exports CSV with quotes escaped", () => {
    const csv = toCsv([{ ...SEED_HISTORY[0], summary: 'Said "hello", then left' }]);
    expect(csv.split("\n")[1]).toContain('"Said ""hello"", then left"');
  });
});
