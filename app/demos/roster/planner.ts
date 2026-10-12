"use client";

/**
 * Rosters the weeks around the live one in the background, one week per
 * browser task, so the Overview is ready when someone opens it and the page
 * never freezes. Results are cached until people, shifts or rules change.
 */
import { useEffect, useSyncExternalStore } from "react";
import { analyse } from "@/lib/roster/engine";
import { lastWeek, PLAN_EVENTS, planWeek, type WeekSummary } from "@/lib/roster/weeks";
import type { RosterState } from "@/lib/roster/types";

interface Plan {
  key: string;
  past: WeekSummary | null;
  ahead: WeekSummary[];
  done: boolean;
}

let plan: Plan = { key: "", past: null, ahead: [], done: false };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
let running: number | null = null;

function keyOf(s: RosterState) {
  return JSON.stringify([s.weekStart, s.staff, s.shifts, s.tenants, s.settings, s.contract]);
}

function start(state: RosterState) {
  const key = keyOf(state);
  if (plan.key === key) return;
  if (running !== null) window.clearTimeout(running);
  plan = { key, past: null, ahead: [], done: false };
  emit();
  const total = PLAN_EVENTS.length + 1;
  let i = -1;
  let prev = Object.fromEntries(Object.entries(analyse(state).weeks).map(([id, w]) => [id, w.hours]));
  const step = () => {
    if (plan.key !== key) return;
    if (i === -1) {
      plan = { ...plan, past: lastWeek({ ...state, assignments: {} }) };
    } else {
      const r = planWeek(state, i, prev);
      prev = r.hours;
      plan = { ...plan, ahead: [...plan.ahead, r.week], done: i === total - 1 };
    }
    emit();
    i++;
    running = i < total ? window.setTimeout(step, 16) : null;
  };
  running = window.setTimeout(step, 400);
}

export function usePlannedWeeks(state: RosterState) {
  useEffect(() => {
    start(state);
  }, [state]);
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => plan,
    () => plan,
  );
}
