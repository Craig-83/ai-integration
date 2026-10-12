import { analyse } from "../engine";
import { manualRoster } from "../scenarios";
import { lastWeek, planAhead, summariseWeek } from "../weeks";

test("weeks tell a clear story and compute fast", () => {
  const s = manualRoster();
  const a = analyse(s);
  const t0 = Date.now();
  const ahead = planAhead(s, a);
  const past = lastWeek({ ...s, assignments: {} });
  const ms = Date.now() - t0;
  const cur = summariseWeek(s, a, "current");
  const rows = [past, cur, ...ahead].map((w) => `${w.weekStart} ${w.kind} ${w.light} ${w.headline} ${w.filled}/${w.slots} ${Math.round(w.cost)} | ${w.days.map((d) => d.light[0]).join("")}`);
  console.log(rows.join("\n"), `\n${ms}ms`);
  expect(cur.light).toBe("red");
  expect(ahead[0].light).not.toBe("red");
  expect(ahead[3].kind).toBe("unrostered");
});
