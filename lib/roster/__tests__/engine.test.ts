import { BASE_HOURLY } from "../award";
import { analyse, autoRoster, costStaffWeek, rankCandidates } from "../engine";
import { seedState } from "../seed";
import type { RosterState } from "../types";

function withAssignments(a: Record<string, string[]>): RosterState {
  return { ...seedState(), assignments: a };
}
const codes = (s: RosterState, staffId: string) =>
  analyse(s).flags.filter((f) => f.staffId === staffId).map((f) => `${f.severity}:${f.code}`);

describe("auto-roster", () => {
  const rostered = autoRoster(seedState(), { keepExisting: false });
  const a = analyse(rostered);

  it("fills every slot with no critical or high flags", () => {
    expect(a.totals.filled).toBe(a.totals.slots);
    expect(a.totals.counts.critical).toBe(0);
    expect(a.totals.counts.high).toBe(0);
  });

  it("lands inside the weekly labour allocation", () => {
    expect(a.totals.contractCost).toBeLessThan(a.totals.allocCost);
  });

  it("never rosters the working holiday maker past 6 months", () => {
    const jack = Object.entries(rostered.assignments).filter(([, ids]) => ids.includes("jack"));
    expect(jack).toHaveLength(0);
  });
});

describe("visa rules", () => {
  it("flags a student over 48 hours in the Monday-start fortnight as critical", () => {
    // Priya worked 32 h last week; four 4-hour shifts takes her to 48, a fifth breaches
    const s = withAssignments({
      "law-0-1800": ["priya"],
      "law-2-1800": ["priya"],
      "law-3-1800": ["priya"],
      "law-4-1800": ["priya"],
      "childcare-5-0900": ["priya"],
    });
    expect(codes(s, "priya")).toContain("critical:visa-cap");
  });

  it("drops the student cap when the course is on a scheduled break", () => {
    const s = withAssignments({ "law-0-1800": ["priya"], "law-2-1800": ["priya"], "law-3-1800": ["priya"], "law-4-1800": ["priya"], "childcare-5-0900": ["priya"] });
    s.settings = { ...s.settings, courseInSession: false };
    expect(codes(s, "priya")).not.toContain("critical:visa-cap");
  });

  it("flags a working holiday maker past 6 months at this site", () => {
    expect(codes(withAssignments({ "studio-0-1730": ["jack"] }), "jack")).toContain("critical:whm");
  });
});

describe("security", () => {
  it("lets a Baseline holder work the NV1 floors only when escorted", () => {
    const escorted = withAssignments({ "ccco-0-1800": ["aisha", "meilin"] });
    expect(codes(escorted, "meilin")).toContain("medium:escorted");
    const alone = withAssignments({ "ccco-0-1800": ["meilin"] });
    expect(codes(alone, "meilin")).toContain("critical:clearance");
  });

  it("treats a lapsed NV1 as no clearance", () => {
    expect(codes(withAssignments({ "ccco-0-1800": ["ben"] }), "ben")).toContain("critical:clearance");
  });

  it("requires a Working with Children Check for the childcare centre", () => {
    expect(codes(withAssignments({ "childcare-0-1830": ["rohan"] }), "rohan")).toContain("critical:wwc");
  });

  it("flags a missing site induction as high", () => {
    expect(codes(withAssignments({ "studio-0-1730": ["lucy"] }), "lucy")).toContain("high:induction");
  });

  it("flags an induction that lapses mid-week", () => {
    // Olivia's bank induction expires 4 Nov
    expect(codes(withAssignments({ "bank-4-1800": ["olivia"] }), "olivia")).toContain("high:induction");
    expect(codes(withAssignments({ "bank-0-1800": ["olivia"] }), "olivia")).toContain("low:expiring");
  });
});

describe("award costing", () => {
  it("pays a casual 275% on Melbourne Cup Day", () => {
    const s = withAssignments({ "common-1-0500": ["hassan"] });
    const w = costStaffWeek(s, s.staff.find((x) => x.id === "hassan")!);
    expect(w.wages).toBeCloseTo(4 * BASE_HOURLY[1] * 2.75, 2);
  });

  it("pays a casual 140% for a weekday evening shift", () => {
    const s = withAssignments({ "studio-0-1730": ["samuel"] });
    const w = costStaffWeek(s, s.staff.find((x) => x.id === "samuel")!);
    expect(w.wages).toBeCloseTo(4 * BASE_HOURLY[1] * 1.4, 2);
  });

  it("puts a casual's sixth day into overtime", () => {
    const s = withAssignments({
      "common-0-0500": ["samuel"],
      "common-1-0500": ["samuel"],
      "common-2-0500": ["samuel"],
      "common-3-0500": ["samuel"],
      "common-4-0500": ["samuel"],
      "common-5-0500": ["samuel"],
    });
    const w = costStaffWeek(s, s.staff.find((x) => x.id === "samuel")!);
    expect(w.otHours).toBe(4);
    expect(codes(s, "samuel")).toContain("medium:overtime");
  });

  it("flags less than 8 hours between shifts", () => {
    // Clinic finishes 11pm Monday, early clean starts 5am Tuesday
    const s = withAssignments({ "clinic-0-1900": ["samuel"], "common-1-0500": ["samuel"] });
    expect(codes(s, "samuel")).toContain("high:rest");
  });
});

describe("candidate ranking", () => {
  it("ranks clean candidates ahead of flagged ones", () => {
    const ranked = rankCandidates(seedState(), "ccco-0-1800");
    expect(ranked[0].worst === null || ranked[0].worst === "low").toBe(true);
    const ben = ranked.find((c) => c.staff.id === "ben")!;
    expect(ben.worst).toBe("critical");
  });
});
