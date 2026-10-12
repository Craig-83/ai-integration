import { analyse, fixAll } from "../engine";
import { manualRoster, sickCall } from "../scenarios";

test("the manual roster shows the problems a spreadsheet hides", () => {
  const a = analyse(manualRoster());
  expect(a.totals.counts.critical).toBeGreaterThanOrEqual(4);
});

test("fix all clears every critical and high flag", () => {
  const a = analyse(fixAll(manualRoster()));
  expect(a.totals.counts.critical).toBe(0);
  expect(a.totals.counts.high).toBe(0);
});

test("a sick call opens gaps that fix all can cover", () => {
  const s = sickCall(fixAll(manualRoster()), "aisha", 2);
  expect(analyse(s).flags.some((f) => f.code === "unfilled" || f.code === "clearance")).toBe(true);
  expect(analyse(fixAll(s)).totals.counts.critical).toBe(0);
});
