"use client";

import { AWARD_NAME, BASE_HOURLY, ORDINARY, OVERTIME, RATES_AS_AT } from "@/lib/roster/award";
import { addDays, formatDate } from "@/lib/roster/dates";
import { shiftHours } from "@/lib/roster/engine";
import type { Settings } from "@/lib/roster/types";
import { useRoster } from "./store";
import { Bar, Icon, money, Switch } from "./ui";

/** Plausible weekly history that sums exactly to the contract's YTD figures. */
function history(total: number, weeks: number) {
  const shape = [0.97, 1.0, 0.99, 1.02, 0.98, 1.06, 1.01, 0.99, 1.0, 1.04, 0.98, 1.0, 1.08, 0.99, 1.01, 0.97, 1.05, 1.02];
  const s = shape.slice(0, weeks);
  const sum = s.reduce((a, b) => a + b, 0);
  return s.map((x) => (x / sum) * total);
}

export function ContractView() {
  const r = useRoster();
  const { state, analysis } = r;
  const c = state.contract;
  const t = analysis.totals;
  const weekAlloc = t.allocCost;
  const past = history(c.ytdCost, c.ytdWeeks);
  const bars = [...past, t.contractCost];
  // Axis starts well above zero so week-to-week variance is visible
  const max = Math.max(...bars, weekAlloc) * 1.04;
  const min = Math.min(...bars, weekAlloc) * 0.9;
  const y = (v: number) => H - ((v - min) / (max - min)) * H;
  const proRata = weekAlloc * (c.ytdWeeks + 1);
  const spent = c.ytdCost + t.contractCost;
  const remainingWeeks = 52 - c.ytdWeeks - 1;
  const projected = spent + t.contractCost * remainingWeeks;
  const variations = state.shifts.filter((s) => s.chargeable);

  const setSetting = (k: keyof Settings, v: number | boolean) =>
    r.commit({ ...state, settings: { ...state.settings, [k]: v } }, { title: "Setting updated", undo: true });

  const W = 1200;
  const H = 170;
  const bw = W / bars.length;

  return (
    <div className="rg-view">
      <div className="rg-view-head">
        <div>
          <div className="rg-h1">Contract & budget</div>
          <div className="rg-lede">
            {c.name}. The client pays for an agreed number of labour hours a year. Every overtime hour and every extra cleaner the contract doesn&apos;t cover comes out of margin, unless the client asked for it.
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <div className="rg-card">
          <div className="rg-kpi-label">Annual contract</div>
          <div className="rg-kpi-value num">{money(c.annualLabourBudget)}</div>
          <div className="rg-kpi-sub">
            {c.annualHours.toLocaleString()} labour hours · {money(weekAlloc)} / week
          </div>
        </div>
        <div className="rg-card">
          <div className="rg-kpi-label">Spent to date (week {c.ytdWeeks + 1})</div>
          <div className="rg-kpi-value num" style={{ color: spent > proRata ? "var(--rg-high)" : "var(--rg-ok)" }}>
            {money(spent)}
          </div>
          <Bar value={spent} max={proRata} />
          <div className="rg-kpi-sub">
            {spent > proRata ? `${money(spent - proRata)} ahead of pro-rata` : `${money(proRata - spent)} under pro-rata`}
          </div>
        </div>
        <div className="rg-card">
          <div className="rg-kpi-label">Projected year end</div>
          <div className="rg-kpi-value num" style={{ color: projected > c.annualLabourBudget ? "var(--rg-critical)" : "var(--rg-ok)" }}>
            {money(projected)}
          </div>
          <div className="rg-kpi-sub">
            {projected > c.annualLabourBudget
              ? `${money(projected - c.annualLabourBudget)} over if every week looks like this one`
              : `${money(c.annualLabourBudget - projected)} margin kept if every week looks like this one`}
          </div>
        </div>
        <div className="rg-card">
          <div className="rg-kpi-label">Chargeable variations</div>
          <div className="rg-kpi-value num" style={{ color: "var(--rg-ok)" }}>
            {money(t.chargeableCost)}
          </div>
          <div className="rg-kpi-sub">{variations.length ? `${t.chargeableHours}h of client-requested work` : "None this week"}</div>
        </div>
      </div>

      <div className="rg-card" style={{ marginTop: 12 }}>
        <div className="rg-section-title">
          <span>Weekly labour cost vs allocation, FY {c.fyStart.slice(0, 4)}–{String(Number(c.fyStart.slice(0, 4)) + 1).slice(2)}</span>
          <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>Gold bar is the week you are rostering</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H + 24}`} width="100%" role="img" aria-label="Weekly labour cost chart">
          {bars.map((v, i) => {
            const h = H - y(v);
            const current = i === bars.length - 1;
            const over = v > weekAlloc;
            return (
              <g key={i}>
                <rect
                  x={i * bw + 4}
                  y={H - h}
                  width={bw - 8}
                  height={h}
                  rx={3}
                  fill={current ? "var(--rg-gold)" : over ? "rgba(217,105,31,0.55)" : "rgba(20,26,46,0.18)"}
                >
                  <title>{`Week ${i + 1}: ${money(v)}`}</title>
                </rect>
                {(i % 3 === 0 || current) && (
                  <text x={i * bw + bw / 2} y={H + 16} textAnchor="middle" fontSize="11" fill="var(--rg-muted)">
                    {formatDate(addDays(state.weekStart, (i - c.ytdWeeks) * 7))}
                  </text>
                )}
              </g>
            );
          })}
          <line x1={0} x2={W} y1={y(weekAlloc)} y2={y(weekAlloc)} stroke="var(--rg-critical)" strokeDasharray="5 4" strokeWidth={1.5} />
          <text x={6} y={y(weekAlloc) - 6} textAnchor="start" fontSize="12" fill="var(--rg-critical)" fontWeight={600}>
            Weekly allocation {money(weekAlloc)}
          </text>
        </svg>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 12, marginTop: 12 }}>
        <div className="rg-card">
          <div className="rg-section-title">Client-requested work this week</div>
          {variations.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--rg-muted)" }}>
              Nothing yet. Add a shift and mark it as client-requested, and it&apos;s tracked here as a billable variation instead of eating contract hours.
            </div>
          ) : (
            <>
              {variations.map((v) => {
                const tenant = state.tenants.find((x) => x.id === v.tenantId)!;
                const n = state.assignments[v.id]?.length ?? 0;
                return (
                  <div key={v.id} className="rg-row">
                    <div className="rg-row-main">
                      <div className="rg-row-name">{tenant.short}: {v.label}</div>
                      <div className="rg-row-meta">
                        {n} × {shiftHours(v)}h
                      </div>
                    </div>
                    <span className="rg-cost num">{money(analysis.shiftCost[v.id] ?? 0)}</span>
                  </div>
                );
              })}
              <button
                className="rg-btn rg-btn-ok"
                style={{ marginTop: 10 }}
                onClick={() =>
                  r.toast({ title: "Variation sent to invoicing", sub: `${money(t.chargeableCost)} cost basis, ready to price up and invoice the client.`, severity: "ok" })
                }
              >
                <Icon name="check" size={14} /> Send to invoicing
              </button>
            </>
          )}
        </div>

        <div className="rg-card">
          <div className="rg-section-title">Rules in force</div>
          <div className="rg-row" style={{ border: 0, padding: "6px 0" }}>
            <div className="rg-row-main">
              <div className="rg-row-name">Student visa course in session</div>
              <div className="rg-row-meta">Condition 8105: 48 hours per Monday-start fortnight. Off during scheduled course breaks.</div>
            </div>
            <Switch checked={state.settings.courseInSession} onChange={(v) => setSetting("courseInSession", v)} label="Course in session" />
          </div>
          {(
            [
              ["superPct", "Superannuation guarantee"],
              ["payrollTaxPct", "Victorian payroll tax"],
              ["workcoverPct", "WorkCover premium (cleaning)"],
            ] as const
          ).map(([k, l]) => (
            <div key={k} className="rg-row" style={{ border: 0, padding: "6px 0" }}>
              <div className="rg-row-main">
                <div className="rg-row-name">{l}</div>
              </div>
              <input
                type="number"
                step="0.05"
                value={state.settings[k]}
                onChange={(e) => setSetting(k, Number(e.target.value) || 0)}
                style={{ width: 80, height: 30, border: "1px solid var(--rg-line-strong)", borderRadius: 7, padding: "0 8px", textAlign: "right" }}
                aria-label={l}
              />
              <span style={{ color: "var(--rg-muted)" }}>%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rg-card" style={{ marginTop: 12 }}>
        <div className="rg-section-title">
          <span>{AWARD_NAME}</span>
          <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>Rates as at {RATES_AS_AT} · Victoria</span>
        </div>
        <table className="rg-table" style={{ fontSize: 13 }}>
          <thead>
            <tr>
              <th>% of ordinary rate</th>
              <th>Full-time</th>
              <th>Part-time</th>
              <th>Casual</th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                ["Mon to Fri, ordinary", ORDINARY.weekday],
                ["Mon to Fri, starts before 6am or ends after 6pm", ORDINARY.weekdayShift],
                ["Saturday", ORDINARY.saturday],
                ["Sunday", ORDINARY.sunday],
                ["Public holiday", ORDINARY.publicHoliday],
                ["Overtime, first 2 hours (Mon to Sat)", OVERTIME.first2],
                ["Overtime, after 2 hours", OVERTIME.after2],
              ] as const
            ).map(([l, row]) => (
              <tr key={l} style={{ cursor: "default" }}>
                <td>{l}</td>
                <td className="num">{Math.round(row.FT * 100)}%</td>
                <td className="num">{Math.round(row.PT * 100)}%</td>
                <td className="num">{Math.round(row.CAS * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ fontSize: 12, color: "var(--rg-muted)", marginTop: 8 }}>
          Ordinary hourly rate: Level 1 ${BASE_HOURLY[1].toFixed(2)}, Level 2 ${BASE_HOURLY[2].toFixed(2)}, Level 3 ${BASE_HOURLY[3].toFixed(2)}. Overtime for part-time and casual staff kicks in over 7.6 hours a day, 38 a week, or a sixth day. Minimum engagement 4 hours at sites over 5,000 sqm. 8 hours off between shifts.
        </div>
      </div>
    </div>
  );
}
