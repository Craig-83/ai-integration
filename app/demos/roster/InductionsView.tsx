"use client";

import { useState } from "react";
import { analyse, credentialStatus, RANK_LABEL } from "@/lib/roster/engine";
import { addDays, daysBetween, formatDate } from "@/lib/roster/dates";
import type { Credential, RosterState, Staff } from "@/lib/roster/types";
import { useRoster } from "./store";
import { Avatar, Icon } from "./ui";

type Col = { key: string; label: string; kind: "induction" | "police" | "wwc" | "agsva"; scope?: string };

function columns(state: RosterState): Col[] {
  const scopes = state.tenants.flatMap((t) => t.requirements.filter((r) => r.kind === "induction").map((r) => ({ scope: (r as { scope: string }).scope, label: t.short })));
  return [
    { key: "site", label: "Site induction", kind: "induction", scope: "site" },
    ...scopes.map((s) => ({ key: s.scope, label: `${s.label} induction`, kind: "induction" as const, scope: s.scope })),
    { key: "police", label: "Police check", kind: "police" },
    { key: "wwc", label: "WWC", kind: "wwc" },
    { key: "agsva", label: "Clearance", kind: "agsva" },
  ];
}

function cellStatus(s: Staff, col: Col, date: string) {
  return credentialStatus(
    s,
    (c) => c.kind === col.kind && (col.kind !== "induction" || c.scope === col.scope),
    date,
  );
}

export function InductionsView() {
  const r = useRoster();
  const { state, analysis } = r;
  const cols = columns(state);
  const [record, setRecord] = useState<{ staffId?: string; key?: string } | null>(null);
  const today = state.weekStart;

  const rosteredWithout = analysis.flags.filter((f) => f.code === "induction");
  const dueSoon = state.staff.flatMap((s) =>
    s.credentials
      .filter((c) => c.expires && c.expires >= today && daysBetween(today, c.expires) <= 30)
      .map((c) => ({ s, c })),
  );

  return (
    <div className="rg-view">
      <div className="rg-view-head">
        <div>
          <div className="rg-h1">Inductions & access</div>
          <div className="rg-lede">
            Who has been inducted where, and which checks are current. Record an induction here and the roster re-checks every shift instantly.
          </div>
        </div>
        <button className="rg-btn rg-btn-gold" onClick={() => setRecord({})}>
          <Icon name="plus" size={14} /> Record an induction
        </button>
      </div>

      <div className="rg-cols-3" style={{ marginBottom: 16 }}>
        <div className="rg-card">
          <div className="rg-kpi-label">Rostered without an induction</div>
          <div className="rg-kpi-value num" style={{ color: rosteredWithout.length ? "var(--rg-high)" : "var(--rg-ok)" }}>{rosteredWithout.length}</div>
          {rosteredWithout.slice(0, 3).map((f) => (
            <div key={f.id} style={{ fontSize: 12.5, color: "var(--rg-muted)", marginTop: 3 }}>
              {f.title}
            </div>
          ))}
        </div>
        <div className="rg-card">
          <div className="rg-kpi-label">Expiring in the next 30 days</div>
          <div className="rg-kpi-value num" style={{ color: dueSoon.length ? "var(--rg-medium)" : "var(--rg-ok)" }}>{dueSoon.length}</div>
          {dueSoon.slice(0, 3).map(({ s, c }) => (
            <div key={c.id} style={{ fontSize: 12.5, color: "var(--rg-muted)", marginTop: 3 }}>
              {s.name}: {c.kind === "agsva" ? RANK_LABEL[c.rank!] : c.kind === "induction" ? `${c.scope === "site" ? "site" : state.tenants.find((t) => t.id === c.scope)?.short} induction` : c.kind === "wwc" ? "WWC" : "police check"}, {formatDate(c.expires!)}
            </div>
          ))}
        </div>
        <div className="rg-card">
          <div className="rg-kpi-label">Not yet site-inducted</div>
          {(() => {
            const list = state.staff.filter((s) => cellStatus(s, cols[0], today).status !== "ok" && cellStatus(s, cols[0], today).status !== "expiring");
            return (
              <>
                <div className="rg-kpi-value num" style={{ color: list.length ? "var(--rg-high)" : "var(--rg-ok)" }}>{list.length}</div>
                {list.slice(0, 3).map((s) => (
                  <div key={s.id} style={{ fontSize: 12.5, color: "var(--rg-muted)", marginTop: 3 }}>
                    {s.name}
                    {s.role ? `: ${s.role}` : ""}
                  </div>
                ))}
              </>
            );
          })()}
        </div>
      </div>

      <div className="rg-scroll-x"><table className="rg-table rg-matrix">
        <thead>
          <tr>
            <th>Staff</th>
            {cols.map((c) => (
              <th key={c.key} style={{ textAlign: "center" }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state.staff.map((s) => (
            <tr key={s.id} style={{ cursor: "default" }}>
              <td>
                <button
                  onClick={() => r.setDrawer({ kind: "person", id: s.id })}
                  style={{ display: "flex", alignItems: "center", gap: 8, border: 0, background: "none", padding: 0, textAlign: "left" }}
                >
                  <Avatar staff={s} size="sm" />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</span>
                </button>
              </td>
              {cols.map((col) => {
                const st = cellStatus(s, col, today);
                const canRecord = col.kind !== "agsva";
                const text =
                  st.status === "missing"
                    ? canRecord
                      ? "+ Record"
                      : "None"
                    : col.kind === "agsva"
                      ? RANK_LABEL[st.cred!.rank!]
                      : st.status === "expired"
                        ? "Expired"
                        : "Done";
                return (
                  <td key={col.key} className="cell">
                    <button
                      className={`rg-mcell ${st.status === "missing" && !canRecord ? "na" : st.status}`}
                      onClick={() => canRecord && setRecord({ staffId: s.id, key: col.key })}
                      disabled={!canRecord}
                      title={canRecord ? `Record ${col.label.toLowerCase()} for ${s.name}` : "Clearances are issued by AGSVA"}
                    >
                      {text}
                      {st.cred?.expires && st.status !== "missing" && <small>{st.status === "expired" ? "" : "to "}{formatDate(st.cred.expires, true)}</small>}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table></div>
      {record && <RecordInductionModal staffId={record.staffId} preset={record.key} onClose={() => setRecord(null)} />}
    </div>
  );
}

const INDUCTORS = ["Maria Santos (site supervisor)", "Tran Nguyen (leading hand)", "Tenant security team", "Building facilities team"];

export function RecordInductionModal({ staffId, preset, onClose }: { staffId?: string; preset?: string; onClose: () => void }) {
  const r = useRoster();
  const { state } = r;
  const cols = columns(state).filter((c) => c.kind !== "agsva");
  const [who, setWho] = useState(staffId ?? state.staff.find((s) => s.credentials.every((c) => c.scope !== "site"))?.id ?? state.staff[0].id);
  const [key, setKey] = useState(preset ?? "site");
  const [date, setDate] = useState(state.weekStart);
  const [by, setBy] = useState(INDUCTORS[0]);
  const col = cols.find((c) => c.key === key) ?? cols[0];
  const years = col.kind === "wwc" ? 5 : col.kind === "police" ? 3 : 1;

  const save = () => {
    const [y, m, d] = date.split("-");
    const cred: Credential = {
      id: `rec-${Date.now().toString(36)}`,
      kind: col.kind as Credential["kind"],
      scope: col.kind === "induction" ? col.scope : undefined,
      issued: date,
      expires: `${Number(y) + years}-${m}-${d}`,
      inductedBy: col.kind === "induction" ? by.split(" (")[0] : undefined,
    };
    const before = r.analysis.totals.counts;
    const staff = state.staff.map((s) =>
      s.id === who
        ? { ...s, credentials: [...s.credentials.filter((c) => !(c.kind === cred.kind && c.scope === cred.scope)), cred] }
        : s,
    );
    const next = { ...state, staff };
    const after = analyse(next).totals.counts;
    const cleared = before.critical + before.high - (after.critical + after.high);
    const name = state.staff.find((s) => s.id === who)!.name.split(" ")[0];
    r.commit(next, {
      title: `${col.label} recorded for ${name}`,
      sub: cleared > 0 ? `That cleared ${cleared} roster ${cleared === 1 ? "issue" : "issues"}.` : `Valid to ${formatDate(cred.expires!, true)}.`,
      severity: "ok",
      undo: true,
    });
    onClose();
  };

  return (
    <div className="rg-modal-wrap" onClick={onClose}>
      <div className="rg-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Record induction">
        <div style={{ fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="badge" size={18} /> Record an induction or check
        </div>
        <div style={{ color: "var(--rg-muted)", fontSize: 13 }}>The roster re-checks every shift as soon as you save.</div>
        <label className="rg-field">
          Staff member
          <select value={who} onChange={(e) => setWho(e.target.value)}>
            {state.staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="rg-field">
          Induction or check
          <select value={key} onChange={(e) => setKey(e.target.value)}>
            {cols.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label className="rg-field">
            Completed on
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="rg-field">
            Valid until
            <input type="text" readOnly value={formatDate(addDays(date, 0).replace(/^\d{4}/, (y) => String(Number(y) + years)), true)} />
          </label>
        </div>
        {col.kind === "induction" && (
          <label className="rg-field">
            Inducted by
            <select value={by} onChange={(e) => setBy(e.target.value)}>
              {INDUCTORS.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </label>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 }}>
          <button className="rg-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="rg-btn rg-btn-gold" onClick={save}>
            <Icon name="check" size={14} /> Save record
          </button>
        </div>
      </div>
    </div>
  );
}
