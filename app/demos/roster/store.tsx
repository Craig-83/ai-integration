"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { analyse, evaluateCandidate, type Analysis } from "@/lib/roster/engine";
import { manualRoster } from "@/lib/roster/scenarios";
import type { Credential, RosterState, Severity } from "@/lib/roster/types";
import { DAY_SHORT, formatTime } from "@/lib/roster/dates";

const STORAGE_KEY = "cm-roster-demo-v1";
const HISTORY_LIMIT = 60;

export type Drawer =
  | { kind: "shift"; id: string; replacing?: string }
  | { kind: "issues"; severity?: Severity }
  | { kind: "person"; id: string }
  | { kind: "tenant"; id: string }
  | null;

export interface Toast {
  id: number;
  title: string;
  sub?: string;
  severity?: Severity | "ok";
  undo?: boolean;
}

interface Store {
  state: RosterState;
  analysis: Analysis;
  canUndo: boolean;
  canRedo: boolean;
  commit: (next: RosterState, toast?: Omit<Toast, "id">) => void;
  undo: () => void;
  redo: () => void;
  assign: (shiftId: string, staffId: string, opts?: { replacing?: string; from?: string }) => void;
  unassign: (shiftId: string, staffId: string) => void;
  addCredential: (staffId: string, cred: Credential) => void;
  drawer: Drawer;
  setDrawer: (d: Drawer) => void;
  toasts: Toast[];
  toast: (t: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
  drag: { staffId: string; from?: string } | null;
  setDrag: (d: { staffId: string; from?: string } | null) => void;
  pulse: string | null;
}

const Ctx = createContext<Store | null>(null);

export function useRoster() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useRoster outside provider");
  return s;
}

export function RosterProvider({ children }: { children: ReactNode }) {
  const [hist, setHist] = useState(() => ({ past: [] as RosterState[], present: manualRoster(), future: [] as RosterState[] }));
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [drag, setDrag] = useState<{ staffId: string; from?: string } | null>(null);
  const [pulse, setPulse] = useState<string | null>(null);
  const seq = useRef(0);
  const loaded = useRef(false);

  // Restore after mount so server and client render the same first frame
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as RosterState;
        if (saved?.weekStart && Array.isArray(saved.shifts)) setHist({ past: [], present: saved, future: [] });
      }
    } catch {
      /* private mode or corrupt: start from the scenario */
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(hist.present));
    } catch {
      /* ignore */
    }
  }, [hist.present]);

  const state = hist.present;
  const analysis = useMemo(() => analyse(state), [state]);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = ++seq.current;
      setToasts((cur) => [...cur.slice(-2), { ...t, id }]);
      window.setTimeout(() => dismiss(id), t.severity === "critical" || t.severity === "high" ? 7000 : 4500);
    },
    [dismiss],
  );

  const commit = useCallback(
    (next: RosterState, t?: Omit<Toast, "id">) => {
      setHist((h) => ({ past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: [] }));
      if (t) toast(t);
    },
    [toast],
  );

  const undo = useCallback(() => {
    setHist((h) => (h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h));
  }, []);
  const redo = useCallback(() => {
    setHist((h) => (h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h));
  }, []);

  const assign = useCallback(
    (shiftId: string, staffId: string, opts: { replacing?: string; from?: string } = {}) => {
      const sh = state.shifts.find((s) => s.id === shiftId)!;
      const staff = state.staff.find((s) => s.id === staffId)!;
      // Moving from another shift: take them off it first
      let base = state;
      if (opts.from && opts.from !== shiftId) {
        base = { ...state, assignments: { ...state.assignments, [opts.from]: (state.assignments[opts.from] ?? []).filter((id) => id !== staffId) } };
      }
      const cur = base.assignments[shiftId] ?? [];
      if (cur.includes(staffId)) return;
      const ev = evaluateCandidate(base, shiftId, staffId, opts.replacing);
      const nextIds = opts.replacing ? cur.map((id) => (id === opts.replacing ? staffId : id)) : [...cur, staffId];
      const next = { ...base, assignments: { ...base.assignments, [shiftId]: nextIds } };
      const tenant = state.tenants.find((t) => t.id === sh.tenantId)!;
      const worst = ev.flags.sort((a, b) => rank(b.severity) - rank(a.severity))[0];
      setPulse(shiftId);
      window.setTimeout(() => setPulse(null), 900);
      commit(next, {
        title: `${staff.name.split(" ")[0]} → ${tenant.short}, ${DAY_SHORT[sh.day]} ${formatTime(sh.start)}`,
        sub: worst
          ? worst.title + (ev.flags.length > 1 ? ` (+${ev.flags.length - 1} more)` : "")
          : `No issues. ${ev.costDelta >= 0 ? "Adds" : "Saves"} $${Math.abs(Math.round(ev.costDelta)).toLocaleString()} incl. on-costs.`,
        severity: worst?.severity ?? "ok",
        undo: true,
      });
    },
    [state, commit],
  );

  const unassign = useCallback(
    (shiftId: string, staffId: string) => {
      const staff = state.staff.find((s) => s.id === staffId)!;
      commit(
        { ...state, assignments: { ...state.assignments, [shiftId]: (state.assignments[shiftId] ?? []).filter((id) => id !== staffId) } },
        { title: `${staff.name.split(" ")[0]} removed from shift`, undo: true },
      );
    },
    [state, commit],
  );

  const addCredential = useCallback(
    (staffId: string, cred: Credential) => {
      const staff = state.staff.map((s) =>
        s.id === staffId
          ? {
              ...s,
              credentials: [
                ...s.credentials.filter((c) => !(c.kind === cred.kind && c.scope === cred.scope && c.rank === cred.rank)),
                cred,
              ],
            }
          : s,
      );
      commit({ ...state, staff });
    },
    [state, commit],
  );

  const value: Store = {
    state,
    analysis,
    canUndo: hist.past.length > 0,
    canRedo: hist.future.length > 0,
    commit,
    undo,
    redo,
    assign,
    unassign,
    addCredential,
    drawer,
    setDrawer,
    toasts,
    toast,
    dismiss,
    drag,
    setDrag,
    pulse,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const rank = (s: Severity) => ({ low: 1, medium: 2, high: 3, critical: 4 })[s];
