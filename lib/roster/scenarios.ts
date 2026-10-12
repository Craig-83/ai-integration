/**
 * Canned starting points for the live demo.
 */
import { autoRoster } from "./engine";
import { seedState } from "./seed";
import type { RosterState, Shift } from "./types";

/**
 * What a site manager might build by hand in a spreadsheet: mostly sensible,
 * copied forward from last week, with the mistakes that actually happen.
 */
export function manualRoster(): RosterState {
  const base = autoRoster(seedState(), { keepExisting: false });
  const a: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(base.assignments)) a[k] = [...v];
  const day = (shiftId: string) => base.shifts.find((s) => s.id === shiftId)!.day;

  /** Put staffId into a slot. Whoever was there takes staffId's old shift that day, if any. */
  const swapIn = (shiftId: string, staffId: string, slot = 0) => {
    const displaced = a[shiftId][slot];
    if (displaced === staffId) return;
    const old = Object.keys(a).find((k) => k !== shiftId && day(k) === day(shiftId) && a[k].includes(staffId));
    if (old && displaced) a[old] = a[old].map((id) => (id === staffId ? displaced : id));
    else if (old) a[old] = a[old].filter((id) => id !== staffId);
    a[shiftId][slot] = staffId;
  };
  const add = (shiftId: string, staffId: string) => {
    if (!a[shiftId].includes(staffId)) a[shiftId] = [...a[shiftId], staffId];
  };

  // Priya is reliable, so she gets loaded up: 32 h last week + 20 h this week
  swapIn("law-0-1800", "priya");
  swapIn("law-2-1800", "priya");
  swapIn("law-3-1800", "priya");
  swapIn("childcare-4-1830", "priya");
  swapIn("childcare-5-0900", "priya");
  // Jack has been on site since April and nobody is counting
  swapIn("studio-0-1730", "jack");
  swapIn("studio-2-1730", "jack");
  // Ben is still listed as NV1 on last week's sheet
  swapIn("ccco-3-1800", "ben", 1);
  // New starter thrown on before her induction
  swapIn("law-4-1800", "lucy", 1);
  // Rohan covers the childcare centre without a WWC
  swapIn("childcare-2-1830", "rohan");
  // Olivia on the bank floors after her induction lapses
  swapIn("bank-4-1800", "olivia");
  // Samuel does a late clinic shift then the 5am early clean
  swapIn("clinic-0-1900", "samuel");
  swapIn("common-1-0500", "samuel");
  // Maria the supervisor covers the public holiday and the weekend herself
  swapIn("clinic-1-1900", "maria");
  swapIn("bank-5-0800", "maria");
  swapIn("childcare-5-0900", "maria");
  // Extra hands on Cup Day and Saturday "just in case"
  add("common-1-0500", "hassan");
  add("common-1-1700", "nikolai");
  add("common-5-0500", "ana");
  // One shift simply forgotten
  a["studio-4-1730"] = a["studio-4-1730"].slice(0, 1);

  return { ...base, assignments: a };
}

export function blankRoster(): RosterState {
  return seedState();
}

/** Someone calls in sick: pull them from a day and mark them unavailable. */
export function sickCall(state: RosterState, staffId: string, day: number): RosterState {
  const assignments: Record<string, string[]> = {};
  for (const [k, ids] of Object.entries(state.assignments)) {
    const sh = state.shifts.find((s) => s.id === k);
    assignments[k] = sh && sh.day === day ? ids.filter((id) => id !== staffId) : ids;
  }
  const staff = state.staff.map((s) =>
    s.id === staffId ? { ...s, availability: s.availability.map((v, i) => (i === day ? null : v)) } : s,
  );
  return { ...state, assignments, staff };
}

export function extraClean(state: RosterState): RosterState {
  const id = "bank-6-0900-extra";
  if (state.shifts.some((s) => s.id === id)) return state;
  const sh: Shift = {
    id,
    tenantId: "bank",
    day: 6,
    start: 9 * 60,
    end: 13 * 60,
    slots: 2,
    label: "Post-fit-out clean (client request)",
    chargeable: true,
  };
  return { ...state, shifts: [...state.shifts, sh], assignments: { ...state.assignments, [id]: [] } };
}
