/**
 * Roster demo domain types. Everything here is plain data so the whole
 * roster can be serialised to localStorage and replayed for undo.
 */

export type EmploymentType = "FT" | "PT" | "CAS";
export type AwardLevel = 1 | 2 | 3;
export type VisaType = "citizen" | "pr" | "student" | "whm" | "graduate";
export type Severity = "critical" | "high" | "medium" | "low";
/** 0 = Monday ... 6 = Sunday */
export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** AGSVA clearance ranks: Baseline < NV1 < NV2. A higher rank covers a lower one. */
export type ClearanceRank = 1 | 2 | 3;

export type CredentialKind = "agsva" | "police" | "wwc" | "induction";

export interface Credential {
  id: string;
  kind: CredentialKind;
  /** For agsva only */
  rank?: ClearanceRank;
  /** For induction only: "site" or a tenant id */
  scope?: string;
  issued: string; // YYYY-MM-DD
  expires?: string; // YYYY-MM-DD
  /** Inductions record who delivered them */
  inductedBy?: string;
  note?: string;
}

export interface Visa {
  type: VisaType;
  /** Student visas: hours worked in the previous Monday-start week (all employers). */
  prevWeekHours?: number;
  /** Working holiday: date first worked for this client site (condition 8547). */
  whmSiteStart?: string;
}

/** [startMinutes, endMinutes] from midnight, or null when unavailable. */
export type DayAvailability = [number, number] | null;

export interface Staff {
  id: string;
  name: string;
  type: EmploymentType;
  level: AwardLevel;
  visa: Visa;
  /** Part-time agreed weekly hours */
  agreedHours?: number;
  availability: DayAvailability[]; // length 7, Monday first
  credentials: Credential[];
  role?: string;
}

export type Requirement =
  | { kind: "agsva"; rank: ClearanceRank }
  | { kind: "police" }
  | { kind: "wwc" }
  | { kind: "induction"; scope: string };

export interface EscortRule {
  /** Staff below the required clearance may work if escorted by a holder on the same shift. */
  allowed: boolean;
  /** Minimum clearance the escorted person must still hold (0 = none needed). */
  escorteeMinRank: 0 | ClearanceRank;
}

export interface Tenant {
  id: string;
  name: string;
  short: string;
  floors: string;
  sector: string;
  hue: number; // for the colour chip
  requirements: Requirement[];
  escort?: EscortRule;
  window: string;
  notes?: string;
}

export interface Shift {
  id: string;
  tenantId: string;
  day: DayIndex;
  start: number; // minutes from midnight
  end: number;
  slots: number;
  label: string;
  /** Client-requested work outside the contract: billable as a variation. */
  chargeable?: boolean;
}

export interface Contract {
  name: string;
  client: string;
  fyStart: string; // YYYY-MM-DD
  annualHours: number;
  annualLabourBudget: number; // dollars incl. on-costs
  /** Hours and dollars already used this FY before the rostered week */
  ytdHours: number;
  ytdCost: number;
  ytdWeeks: number;
}

export interface Settings {
  /** Student course in session: 48 hr/fortnight cap applies. */
  courseInSession: boolean;
  superPct: number;
  payrollTaxPct: number;
  workcoverPct: number;
}

export interface RosterState {
  weekStart: string; // Monday, YYYY-MM-DD
  staff: Staff[];
  tenants: Tenant[];
  shifts: Shift[];
  /** shiftId -> staffIds */
  assignments: Record<string, string[]>;
  contract: Contract;
  settings: Settings;
}

export interface Flag {
  id: string;
  severity: Severity;
  code: string;
  title: string;
  detail: string;
  staffId?: string;
  shiftId?: string;
  /** Avoidable dollars attached to the flag, if any */
  dollars?: number;
}
