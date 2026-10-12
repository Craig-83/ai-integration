"use client";

import { useEffect, useRef, useState } from "react";
import "./roster.css";
import { analyse, autoRoster, fixAll } from "@/lib/roster/engine";
import { blankRoster, extraClean, manualRoster, sickCall } from "@/lib/roster/scenarios";
import { formatDate } from "@/lib/roster/dates";
import { addDays } from "@/lib/roster/dates";
import type { Severity } from "@/lib/roster/types";
import { RosterProvider, useRoster } from "./store";
import { Bar, Icon, money, SEV_COLOR } from "./ui";
import { RosterBoard } from "./RosterBoard";
import { ShiftDrawer } from "./ShiftDrawer";
import { IssuesDrawer } from "./IssuesDrawer";
import { PersonDrawer } from "./PersonDrawer";
import { PeopleView } from "./PeopleView";
import { InductionsView } from "./InductionsView";
import { SitesView, TenantDrawer } from "./SitesView";
import { ContractView } from "./ContractView";
import { SEVERITY_LABEL } from "@/lib/roster/engine";

type Tab = "roster" | "people" | "inductions" | "sites" | "contract";
const TABS: { id: Tab; label: string }[] = [
  { id: "roster", label: "Roster" },
  { id: "people", label: "People" },
  { id: "inductions", label: "Inductions" },
  { id: "sites", label: "Tenants" },
  { id: "contract", label: "Contract" },
];

export default function RosterApp() {
  return (
    <RosterProvider>
      <Shell />
    </RosterProvider>
  );
}

function Shell() {
  const [tab, setTab] = useState<Tab>("roster");
  const r = useRoster();
  const { state, analysis, drawer, setDrawer } = r;
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const runAuto = () => {
    const next = autoRoster(state, { keepExisting: false });
    const a = analyse(next);
    r.commit(next, {
      title: `Rostered ${a.totals.filled} of ${a.totals.slots} slots in one pass`,
      sub: `${money(a.totals.contractCost)} against a ${money(a.totals.allocCost)} budget. ${a.totals.counts.critical + a.totals.counts.high === 0 ? "No compliance issues." : `${a.totals.counts.critical + a.totals.counts.high} issues need a person to decide.`}`,
      severity: "ok",
      undo: true,
    });
    setTab("roster");
    setDrawer(null);
  };
  const runFix = () => {
    const before = analysis;
    const next = fixAll(state);
    const a = analyse(next);
    let moved = 0;
    for (const sh of state.shifts) {
      const was = state.assignments[sh.id] ?? [];
      moved += (next.assignments[sh.id] ?? []).filter((id) => !was.includes(id)).length;
    }
    const fixed = before.totals.counts.critical + before.totals.counts.high - (a.totals.counts.critical + a.totals.counts.high);
    r.commit(next, {
      title: fixed > 0 ? `Fixed ${fixed} critical and high issues` : "Nothing serious to fix",
      sub: `${moved} ${moved === 1 ? "change" : "changes"} to the roster. Weekly cost ${money(before.totals.contractCost)} → ${money(a.totals.contractCost)}.`,
      severity: "ok",
      undo: true,
    });
    setTab("roster");
    setDrawer(null);
  };

  const scenarios: { label: string; sub: string; run: () => void }[] = [
    {
      label: "Friday's spreadsheet roster",
      sub: "Built by hand and copied from last week. Looks fine. Isn't.",
      run: () => r.commit(manualRoster(), { title: "Loaded the hand-built roster", sub: "Same people, same shifts, the mistakes nobody spotted.", undo: true }),
    },
    { label: "Blank week", sub: "Every shift open, ready to auto-roster", run: () => r.commit(blankRoster(), { title: "Cleared the week", undo: true }) },
    { label: "Auto-roster from scratch", sub: "Cheapest compliant roster in one pass (A)", run: runAuto },
    { label: "Fix everything", sub: "Swap out every critical and high issue, keep the rest (F)", run: runFix },
    {
      label: "Sick call: Aisha is out Wednesday",
      sub: "She's an NV1 escort. Watch what that breaks.",
      run: () => {
        r.commit(sickCall(state, "aisha", 2), { title: "Aisha called in sick for Wednesday", sub: "Her shifts are open and she's marked unavailable.", severity: "high", undo: true });
        setTab("roster");
      },
    },
    {
      label: "Client requests an extra clean",
      sub: "Sunday post-fit-out clean at Southbank Mutual, chargeable",
      run: () => {
        r.commit(extraClean(state), { title: "Added a chargeable variation", sub: "Sunday 9am, 2 cleaners. Billed to the client, not the contract.", severity: "ok", undo: true });
        setTab("roster");
        setDrawer({ kind: "shift", id: "bank-6-0900-extra" });
      },
    },
    {
      label: state.settings.courseInSession ? "Uni exams are over" : "Semester is back",
      sub: state.settings.courseInSession ? "Course break: student 48-hour cap lifts" : "Course in session: 48-hour cap applies",
      run: () =>
        r.commit(
          { ...state, settings: { ...state.settings, courseInSession: !state.settings.courseInSession } },
          { title: state.settings.courseInSession ? "Student visa cap lifted for the break" : "Student visa cap back on", undo: true },
        ),
    },
  ];

  // Keyboard shortcuts for presenting
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) r.redo();
        else r.undo();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        setDrawer(null);
        setMenu(false);
      } else if (e.key === "a") runAuto();
      else if (e.key === "f") runFix();
      else if (e.key === "d") setMenu((m) => !m);
      else if (e.key === "i") setDrawer({ kind: "issues" });
      else if (/^[1-5]$/.test(e.key)) setTab(TABS[Number(e.key) - 1].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menu]);

  const t = analysis.totals;
  const serious = t.counts.critical + t.counts.high;
  const variance = t.contractCost - t.allocCost;

  return (
    <div className="rg">
      <header className="rg-head">
        <div className="rg-logo">
          <div className="rg-logo-mark">
            <Icon name="shield" size={17} />
          </div>
          <div>
            <div className="rg-logo-name">Roster Guard</div>
            <div className="rg-logo-sub">
              Collins Exchange Tower · {formatDate(state.weekStart)} to {formatDate(addDays(state.weekStart, 6), true)}
            </div>
          </div>
        </div>
        <nav className="rg-tabs" role="tablist">
          {TABS.map((x, i) => (
            <button key={x.id} role="tab" aria-selected={tab === x.id} className="rg-tab" onClick={() => setTab(x.id)}>
              {x.label}
              <kbd>{i + 1}</kbd>
            </button>
          ))}
        </nav>
        <div className="rg-head-actions">
          <button className="rg-btn rg-btn-dark rg-icon-btn" onClick={r.undo} disabled={!r.canUndo} title="Undo (⌘Z)" aria-label="Undo">
            <Icon name="undo" />
          </button>
          <button className="rg-btn rg-btn-dark rg-icon-btn" onClick={r.redo} disabled={!r.canRedo} title="Redo (⇧⌘Z)" aria-label="Redo">
            <Icon name="redo" />
          </button>
          <div ref={menuRef} style={{ position: "relative" }}>
            <button className="rg-btn rg-btn-dark" onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
              <Icon name="play" size={13} /> Scenarios <Icon name="chevron" size={14} />
            </button>
            {menu && (
              <div className="rg-menu" role="menu">
                {scenarios.map((s, i) => (
                  <button
                    key={s.label}
                    className="rg-menu-item"
                    role="menuitem"
                    onClick={() => {
                      s.run();
                      setMenu(false);
                    }}
                  >
                    <span className="rg-menu-num">{i + 1}</span>
                    <div>
                      <b>{s.label}</b>
                      <span>{s.sub}</span>
                    </div>
                  </button>
                ))}
                <div className="rg-menu-sep" />
                <button
                  className="rg-menu-item"
                  onClick={() => {
                    r.commit(manualRoster(), { title: "Demo reset" });
                    setMenu(false);
                    setTab("roster");
                    setDrawer(null);
                  }}
                >
                  <span className="rg-menu-num">
                    <Icon name="reset" size={12} />
                  </span>
                  <div>
                    <b>Reset demo</b>
                    <span>Back to Friday&apos;s roster with the original staff records</span>
                  </div>
                </button>
              </div>
            )}
          </div>
          <button className="rg-btn rg-btn-dark" onClick={runFix} title="Fix everything (F)" disabled={serious === 0}>
            <Icon name="wand" size={15} /> Fix everything
          </button>
          <button className="rg-btn rg-btn-gold" onClick={runAuto} title="Auto-roster (A)">
            <Icon name="sparkles" size={15} /> Auto-roster
          </button>
        </div>
      </header>

      <section className="rg-kpis" aria-label="This week at a glance">
        <div className="rg-kpi">
          <div className="rg-kpi-label">
            <span>Labour cost</span>
            <span style={{ color: variance > 0 ? "var(--rg-critical)" : "var(--rg-ok)" }}>
              {variance > 0 ? `${money(variance)} over` : `${money(-variance)} under`}
            </span>
          </div>
          <div className="rg-kpi-value num">
            {money(t.contractCost)} <small>/ {money(t.allocCost)}</small>
          </div>
          <Bar value={t.contractCost} max={t.allocCost} />
        </div>
        <div className="rg-kpi">
          <div className="rg-kpi-label">
            <span>Contract hours</span>
            {t.chargeableHours > 0 && <span style={{ color: "var(--rg-ok)" }}>+{t.chargeableHours} h billable</span>}
          </div>
          <div className="rg-kpi-value num">
            {t.contractHours.toFixed(1)} <small>/ {t.allocHours.toFixed(0)} h</small>
          </div>
          <Bar value={t.contractHours} max={t.allocHours} />
        </div>
        <div className="rg-kpi">
          <div className="rg-kpi-label">Shifts covered</div>
          <div className="rg-kpi-value num">
            {t.filled} <small>/ {t.slots}</small>
          </div>
          <div className="rg-kpi-sub">{t.slots - t.filled === 0 ? "Every clean is covered" : `${t.slots - t.filled} open ${t.slots - t.filled === 1 ? "slot" : "slots"}`}</div>
        </div>
        <div className="rg-kpi">
          <div className="rg-kpi-label">Avoidable spend</div>
          <div className="rg-kpi-value num" style={{ color: t.avoidable > 1 ? "var(--rg-high)" : undefined }}>
            {money(t.avoidable)}
          </div>
          <div className="rg-kpi-sub">Overtime and overstaffing</div>
        </div>
        <div className="rg-kpi">
          <div className="rg-kpi-label">
            <span>Compliance</span>
            <button className="rg-btn rg-btn-ghost rg-btn-sm" style={{ height: 20, padding: "0 6px", fontSize: 11 }} onClick={() => setDrawer({ kind: "issues" })}>
              View all (I)
            </button>
          </div>
          {serious === 0 ? (
            <div className="rg-kpi-value" style={{ color: "var(--rg-ok)", fontSize: 16, marginTop: 6, gap: 8 }}>
              <Icon name="check" size={18} /> No visa, clearance or induction breaches
            </div>
          ) : null}
          <div className="rg-flagchips">
            {(["critical", "high", "medium", "low"] as Severity[])
              .filter((s) => serious > 0 || s === "medium" || s === "low")
              .map((s) => (
                <button
                  key={s}
                  className="rg-flagchip"
                  onClick={() => setDrawer({ kind: "issues", severity: s })}
                  style={{ color: t.counts[s] ? SEV_COLOR[s] : "var(--rg-faint)" }}
                >
                  <span className="rg-dot" style={{ background: t.counts[s] ? SEV_COLOR[s] : "var(--rg-faint)" }} />
                  <span className="num">{t.counts[s]}</span> {SEVERITY_LABEL[s]}
                </button>
              ))}
          </div>
        </div>
      </section>

      <div className="rg-main no-rail" style={{ minHeight: 0 }}>
        {tab === "roster" && <RosterBoard />}
        {tab === "people" && <PeopleView />}
        {tab === "inductions" && <InductionsView />}
        {tab === "sites" && <SitesView />}
        {tab === "contract" && <ContractView />}

        {drawer && <div className="rg-scrim" onClick={() => setDrawer(null)} />}
        {drawer?.kind === "shift" && <ShiftDrawer key={drawer.id + (drawer.replacing ?? "")} id={drawer.id} replacing={drawer.replacing} />}
        {drawer?.kind === "issues" && <IssuesDrawer severity={drawer.severity} />}
        {drawer?.kind === "person" && <PersonDrawer key={drawer.id} id={drawer.id} />}
        {drawer?.kind === "tenant" && <TenantDrawer key={drawer.id} id={drawer.id} />}
      </div>

      <div className="rg-toasts" aria-live="polite">
        {r.toasts.map((x) => (
          <div key={x.id} className="rg-toast" style={{ ["--c" as string]: x.severity && x.severity !== "ok" ? SEV_COLOR[x.severity] : x.severity === "ok" ? "var(--rg-ok)" : undefined }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="rg-toast-title">{x.title}</div>
              {x.sub && <div className="rg-toast-sub">{x.sub}</div>}
            </div>
            {x.undo && (
              <button
                className="rg-btn rg-btn-sm"
                onClick={() => {
                  r.undo();
                  r.dismiss(x.id);
                }}
              >
                Undo
              </button>
            )}
            <button className="rg-btn rg-btn-sm rg-icon-btn" style={{ width: 28 }} onClick={() => r.dismiss(x.id)} aria-label="Dismiss">
              <Icon name="x" size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
