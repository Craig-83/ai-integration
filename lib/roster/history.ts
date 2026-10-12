/**
 * Append-only history of everything that happened to the roster: who did
 * what, when, and what the roster looked like as a result. Undo never
 * removes an entry; it adds one. Incidents capture who was rostered on the
 * shift and whether their checks were current at that moment.
 */
import { credentialStatus, RANK_LABEL } from "./engine";
import { DAY_LONG, formatDate, formatRange, shiftDate } from "./dates";
import type { RosterState, Staff } from "./types";

export type HistoryKind =
  | "change"
  | "auto"
  | "fix"
  | "undo"
  | "scenario"
  | "induction"
  | "incident"
  | "publish"
  | "setting";

export interface OnSite {
  staffId: string;
  name: string;
  checks: string; // e.g. "NV1 current, site induction current"
  ok: boolean;
}

export interface HistoryEntry {
  id: string;
  at: string; // ISO timestamp
  actor: string;
  kind: HistoryKind;
  summary: string;
  detail?: string;
  tenantId?: string;
  shiftLabel?: string;
  staffIds?: string[];
  onSite?: OnSite[];
  severity?: "minor" | "major" | "notifiable";
  /** Roster health straight after the change */
  after?: { critical: number; high: number; cost: number };
}

export const RETENTION_OPTIONS = [
  { months: 3, label: "3 months" },
  { months: 12, label: "12 months" },
  { months: 24, label: "2 years" },
  { months: 84, label: "7 years" },
] as const;

export const DEFAULT_RETENTION_MONTHS = 84;

/** Entries older than the retention window, measured back from `today`. */
export function withinRetention(entries: HistoryEntry[], months: number, today: string): HistoryEntry[] {
  const [y, m, d] = today.split("-").map(Number);
  const cutoff = new Date(Date.UTC(y, m - 1 - months, d)).toISOString();
  return entries.filter((e) => e.at >= cutoff);
}

const WORD: Record<string, string> = { ok: "current", expiring: "expiring soon", expired: "expired", missing: "missing" };

function checksFor(state: RosterState, s: Staff, tenantId: string, date: string): OnSite {
  const tenant = state.tenants.find((t) => t.id === tenantId);
  const parts: string[] = [];
  let ok = true;
  const site = credentialStatus(s, (c) => c.kind === "induction" && c.scope === "site", date).status;
  if (site === "missing" || site === "expired") ok = false;
  parts.push(`site induction ${WORD[site]}`);
  for (const req of tenant?.requirements ?? []) {
    if (req.kind === "agsva") {
      const st = credentialStatus(s, (c) => c.kind === "agsva" && (c.rank ?? 0) >= req.rank, date).status;
      if (st === "missing" || st === "expired") ok = false;
      parts.push(`${RANK_LABEL[req.rank]} ${WORD[st]}`);
    } else if (req.kind === "induction") {
      const st = credentialStatus(s, (c) => c.kind === "induction" && c.scope === req.scope, date).status;
      if (st === "missing" || st === "expired") ok = false;
      parts.push(`${tenant?.short} induction ${WORD[st]}`);
    } else {
      const st = credentialStatus(s, (c) => c.kind === req.kind, date).status;
      if (st === "missing" || st === "expired") ok = false;
      parts.push(`${req.kind === "police" ? "police check" : "WWC"} ${WORD[st]}`);
    }
  }
  return { staffId: s.id, name: s.name, checks: parts.join(", "), ok };
}

/** Who was rostered on a shift, with their checks as at that shift's date. */
export function whoWasOnSite(state: RosterState, shiftId: string): OnSite[] {
  const sh = state.shifts.find((s) => s.id === shiftId);
  if (!sh) return [];
  const date = shiftDate(state.weekStart, sh.day);
  return (state.assignments[shiftId] ?? [])
    .map((id) => state.staff.find((s) => s.id === id))
    .filter((s): s is Staff => !!s)
    .map((s) => checksFor(state, s, sh.tenantId, date));
}

export function shiftLabel(state: RosterState, shiftId: string): string {
  const sh = state.shifts.find((s) => s.id === shiftId);
  if (!sh) return "";
  const t = state.tenants.find((x) => x.id === sh.tenantId);
  return `${t?.short ?? ""}, ${DAY_LONG[sh.day]} ${formatDate(shiftDate(state.weekStart, sh.day))}, ${formatRange(sh.start, sh.end)}`;
}

let seq = 0;
export function entryId() {
  return `h${Date.now().toString(36)}${(++seq).toString(36)}`;
}

const at = (date: string, time: string) => `${date}T${time}:00+11:00`;
const SUP = "Maria Santos (site supervisor)";
const OPS = "J. Morrison (operations manager)";
const ENGINE = "Roster Guard";

/**
 * Prior history for the demo contract, oldest first. It reaches back past a
 * year on purpose, so changing the retention setting visibly drops entries.
 */
export const SEED_HISTORY: HistoryEntry[] = [
  { id: "s01", at: at("2024-03-18", "16:05"), actor: OPS, kind: "setting", summary: "Contract started: Collins Exchange Tower", detail: "Annual contract set up with 8 tenants and 28 staff." },
  { id: "s02", at: at("2025-08-12", "21:40"), actor: SUP, kind: "incident", severity: "major", tenantId: "bank", summary: "Incident: access card left in a level 17 door", detail: "Southbank Mutual security found a cleaner's access card in a reader at 9:40pm. Card cancelled and reissued.", onSite: [{ staffId: "luca", name: "Luca Bianchi", checks: "site induction current, police check current, Southbank Mutual induction current", ok: true }] },
  { id: "s03", at: at("2026-07-01", "08:30"), actor: OPS, kind: "setting", summary: "FY 2026–27 contract budget loaded", detail: "15,600 labour hours and $741,000 for the year. Award rates updated to 1 July 2026." },
  { id: "s04", at: at("2026-07-01", "08:42"), actor: ENGINE, kind: "setting", summary: "Award rates updated for 1 July 2026", detail: "Cleaning Services Award 2020 rates rose 4.75%. Every roster from this week is costed at the new rates." },
  { id: "s05", at: at("2026-09-21", "19:10"), actor: SUP, kind: "change", tenantId: "ccco", summary: "Ben Murphy removed from Cyber Office", detail: "NV1 revalidation pack not lodged. Ben moved to Harper Lowe until AGSVA confirms." },
  { id: "s06", at: at("2026-10-01", "00:00"), actor: ENGINE, kind: "setting", summary: "Ben Murphy's NV1 clearance lapsed", detail: "He now shows as not cleared for the Cyber Office. Any roster that puts him there is flagged critical." },
  { id: "s07", at: at("2026-10-21", "18:25"), actor: SUP, kind: "induction", summary: "Site induction recorded: Arjun Patel (refresher)", detail: "Inducted by Maria Santos. Valid to 21 Oct 2027." },
  { id: "s08", at: at("2026-10-28", "21:55"), actor: SUP, kind: "incident", severity: "minor", tenantId: "bank", summary: "Incident: printer room left unlocked, Southbank Mutual L17", detail: "Tenant security found the door unlocked at 10:15pm. Cleaners on the floor were interviewed; no loss.", onSite: [{ staffId: "luca", name: "Luca Bianchi", checks: "site induction current, police check current, Southbank Mutual induction current", ok: true }, { staffId: "rohan", name: "Rohan Mehta", checks: "site induction current, police check current, Southbank Mutual induction current", ok: true }] },
  { id: "s09", at: at("2026-10-30", "16:40"), actor: SUP, kind: "publish", summary: "Roster for 2 to 8 Nov drafted in a spreadsheet and imported", detail: "Copied forward from last week. Not yet checked." },
];

export function kindLabel(k: HistoryKind): string {
  return {
    change: "Roster change",
    auto: "Auto-roster",
    fix: "Fix",
    undo: "Undo",
    scenario: "Scenario",
    induction: "Induction",
    incident: "Incident",
    publish: "Roster",
    setting: "Setting",
  }[k];
}

export function toCsv(entries: HistoryEntry[]): string {
  const esc = (v: string | undefined) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const rows = [["When", "Who", "Type", "Summary", "Detail", "On site", "Severity"].map(esc).join(",")];
  for (const e of entries) {
    rows.push(
      [
        e.at,
        e.actor,
        kindLabel(e.kind),
        e.summary,
        e.detail,
        e.onSite?.map((o) => `${o.name} (${o.checks})`).join("; "),
        e.severity,
      ]
        .map((v) => esc(v))
        .join(","),
    );
  }
  return rows.join("\n");
}
