"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type React from "react";
import { analyse, evaluateCandidate, type Analysis } from "@/lib/roster/engine";
import { manualRoster } from "@/lib/roster/scenarios";
import type { Credential, RosterState, Severity } from "@/lib/roster/types";
import { DAY_SHORT, formatTime } from "@/lib/roster/dates";

const STORAGE_KEY = "cm-roster-demo-v1";
const HISTORY_LIMIT = 60;

export type DragInfo = { staffId: string; from?: string };
export type Hover = { shiftId: string | null; avatarId: string | null };
const NO_HOVER: Hover = { shiftId: null, avatarId: null };

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
  /** What the next undo / redo will reverse, for button labels */
  undoLabel: string | null;
  redoLabel: string | null;
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
  drag: DragInfo | null;
  hover: Hover;
  /** Start a pointer drag from a person (rail row or shift avatar). */
  beginDrag: (e: React.PointerEvent, info: DragInfo) => void;
  /** True for a moment after a drag ends, so the release doesn't count as a click. */
  justDragged: () => boolean;
  ghostRef: React.RefObject<HTMLDivElement | null>;
  pulse: string | null;
}

const Ctx = createContext<Store | null>(null);

export function useRoster() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useRoster outside provider");
  return s;
}

export function RosterProvider({ children }: { children: ReactNode }) {
  type Entry = { state: RosterState; label: string };
  const [hist, setHist] = useState(() => ({ past: [] as Entry[], present: manualRoster(), presentLabel: "", future: [] as Entry[] }));
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [drag, setDrag] = useState<DragInfo | null>(null);
  const [hover, setHover] = useState<Hover>(NO_HOVER);
  const hoverRef = useRef<Hover>(NO_HOVER);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const draggedAt = useRef(0);
  const [pulse, setPulse] = useState<string | null>(null);
  const seq = useRef(0);
  const loaded = useRef(false);

  // Restore after mount so server and client render the same first frame
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as RosterState;
        if (saved?.weekStart && Array.isArray(saved.shifts)) setHist({ past: [], present: saved, presentLabel: "", future: [] });
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
      setToasts((cur) => [...cur.slice(-1), { ...t, id }]);
      window.setTimeout(() => dismiss(id), t.severity === "critical" || t.severity === "high" ? 7000 : 4500);
    },
    [dismiss],
  );

  const commit = useCallback(
    (next: RosterState, t?: Omit<Toast, "id">) => {
      // Each history entry remembers the action that produced the state after it
      setHist((h) => ({
        past: [...h.past, { state: h.present, label: h.presentLabel }].slice(-HISTORY_LIMIT),
        present: next,
        presentLabel: t?.title ?? "last change",
        future: [],
      }));
      if (t) toast(t);
    },
    [toast],
  );

  const undo = useCallback(() => {
    setHist((h) => {
      if (!h.past.length) return h;
      const prev = h.past[h.past.length - 1];
      return { past: h.past.slice(0, -1), present: prev.state, presentLabel: prev.label, future: [{ state: h.present, label: h.presentLabel }, ...h.future] };
    });
  }, []);
  const redo = useCallback(() => {
    setHist((h) => {
      if (!h.future.length) return h;
      const next = h.future[0];
      return { past: [...h.past, { state: h.present, label: h.presentLabel }], present: next.state, presentLabel: next.label, future: h.future.slice(1) };
    });
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
        title: `${staff.name.split(" ")[0]} → ${tenant.short}, ${DAY_SHORT[sh.day]} ${formatTime(sh.start)}${
          opts.replacing ? `, replacing ${state.staff.find((s) => s.id === opts.replacing)?.name.split(" ")[0] ?? ""}` : ""
        }`,
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

  /** Resolve a drop: onto a person swaps them; onto a full shift swaps whoever gives the best result. */
  const dropOnto = (target: Hover, info: DragInfo) => {
    const shiftId = target.shiftId;
    if (!shiftId) return;
    const sh = state.shifts.find((x) => x.id === shiftId);
    if (!sh) return;
    if (info.from === shiftId && (!target.avatarId || target.avatarId === info.staffId)) return;
    const base: RosterState =
      info.from && info.from !== shiftId
        ? { ...state, assignments: { ...state.assignments, [info.from]: (state.assignments[info.from] ?? []).filter((id) => id !== info.staffId) } }
        : state;
    if (!info.from && (base.assignments[shiftId] ?? []).includes(info.staffId)) {
      const name = state.staff.find((x) => x.id === info.staffId)?.name.split(" ")[0];
      toast({ title: `${name} is already on that shift`, severity: "low" });
      return;
    }
    const ids = (base.assignments[shiftId] ?? []).filter((id) => id !== info.staffId);
    let replacing = target.avatarId && target.avatarId !== info.staffId ? target.avatarId : undefined;
    if (!replacing && ids.length >= sh.slots) replacing = bestSwap(base, shiftId, info.staffId);
    assign(shiftId, info.staffId, { replacing, from: info.from });
  };
  const dropRef = useRef(dropOnto);
  dropRef.current = dropOnto;

  const beginDrag = useCallback((e: React.PointerEvent, info: DragInfo) => {
    if (e.button !== 0) return;
    const touch = e.pointerType === "touch";
    const startX = e.clientX;
    const startY = e.clientY;
    let active = false;
    let holdTimer = 0;

    const place = (x: number, y: number) => {
      const g = ghostRef.current;
      if (!g) return;
      // The app scales itself up on very wide screens; undo that for the ghost
      const z = parseFloat(getComputedStyle(g.parentElement ?? g).zoom || "1") || 1;
      g.style.transform = `translate(${(x + 14) / z}px, ${(y + 14) / z}px)`;
    };
    const track = (x: number, y: number) => {
      place(x, y);
      const el = document.elementFromPoint(x, y) as HTMLElement | null;
      const card = el?.closest<HTMLElement>("[data-shift-id]");
      const av = el?.closest<HTMLElement>("[data-avatar-id]");
      const next: Hover = { shiftId: card?.dataset.shiftId ?? null, avatarId: card && av ? av.dataset.avatarId ?? null : null };
      const prev = hoverRef.current;
      if (prev.shiftId !== next.shiftId || prev.avatarId !== next.avatarId) {
        hoverRef.current = next;
        setHover(next);
      }
    };
    const activate = (x: number, y: number) => {
      active = true;
      document.documentElement.classList.add("rg-dragging");
      setDrag(info);
      requestAnimationFrame(() => track(x, y));
    };
    const cleanup = () => {
      window.clearTimeout(holdTimer);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key);
      window.removeEventListener("touchmove", blockScroll);
      document.documentElement.classList.remove("rg-dragging");
      hoverRef.current = NO_HOVER;
      setHover(NO_HOVER);
      setDrag(null);
    };
    const move = (ev: PointerEvent) => {
      if (!active) {
        const d = Math.hypot(ev.clientX - startX, ev.clientY - startY);
        // Touch: moving before the hold completes is a scroll, not a drag
        if (touch) {
          if (d > 8) cleanup();
          return;
        }
        if (d < 5) return;
        activate(ev.clientX, ev.clientY);
      }
      track(ev.clientX, ev.clientY);
    };
    const up = () => {
      if (active) {
        draggedAt.current = Date.now();
        dropRef.current(hoverRef.current, info);
      }
      cleanup();
    };
    const cancel = () => cleanup();
    const key = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") cleanup();
    };
    const blockScroll = (ev: TouchEvent) => {
      if (active) ev.preventDefault();
    };
    if (touch) holdTimer = window.setTimeout(() => activate(startX, startY), 220);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key);
    window.addEventListener("touchmove", blockScroll, { passive: false });
  }, []);

  const justDragged = useCallback(() => Date.now() - draggedAt.current < 250, []);

  const value: Store = {
    state,
    analysis,
    canUndo: hist.past.length > 0,
    canRedo: hist.future.length > 0,
    undoLabel: hist.past.length ? hist.presentLabel || "last change" : null,
    redoLabel: hist.future.length ? hist.future[0].label || "change" : null,
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
    hover,
    beginDrag,
    justDragged,
    ghostRef,
    pulse,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const rank = (s: Severity) => ({ low: 1, medium: 2, high: 3, critical: 4 })[s];

/** Who to swap out of a full shift so the incoming person lands as cleanly and cheaply as possible. */
export function bestSwap(state: RosterState, shiftId: string, staffId: string): string | undefined {
  let best: { score: number; cost: number; id: string } | undefined;
  for (const id of state.assignments[shiftId] ?? []) {
    if (id === staffId) continue;
    const c = evaluateCandidate(state, shiftId, staffId, id);
    const score = c.worst ? rank(c.worst) : 0;
    if (!best || score < best.score || (score === best.score && c.costDelta < best.cost)) best = { score, cost: c.costDelta, id };
  }
  return best?.id;
}
