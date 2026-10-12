/**
 * Fictional demo site: a 32-storey commercial tower in the Melbourne CBD,
 * cleaned under an annual contract. Names, tenants and the building are
 * invented. Credentials are deliberately messy (lapsed, expiring, missing)
 * so the rules engine has something to catch.
 */
import type {
  AwardLevel,
  Credential,
  DayAvailability,
  DayIndex,
  EmploymentType,
  RosterState,
  Shift,
  Staff,
  Tenant,
  Visa,
} from "./types";

export const DEMO_WEEK = "2026-11-02"; // Mon; Tue 3 Nov is Melbourne Cup Day

const t = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** days: digits 1-7 (Mon=1) */
function avail(...blocks: [string, string, string][]): DayAvailability[] {
  const out: DayAvailability[] = [null, null, null, null, null, null, null];
  for (const [days, from, to] of blocks) for (const d of days) out[Number(d) - 1] = [t(from), t(to)];
  return out;
}

let credSeq = 0;
const c = (kind: Credential["kind"], issued: string, expires?: string, extra: Partial<Credential> = {}): Credential => ({
  id: `c${++credSeq}`,
  kind,
  issued,
  expires,
  ...extra,
});
const nv1 = (issued: string, expires = "2034-01-01") => c("agsva", issued, expires, { rank: 2 });
const baseline = (issued: string, expires = "2038-01-01") => c("agsva", issued, expires, { rank: 1 });
/** Company policy: police checks re-done every 3 years */
const police = (issued: string) => {
  const [y, m, d] = issued.split("-");
  return c("police", issued, `${Number(y) + 3}-${m}-${d}`);
};
const wwc = (issued: string, expires?: string) => {
  const [y, m, d] = issued.split("-");
  return c("wwc", issued, expires ?? `${Number(y) + 5}-${m}-${d}`);
};
/** Inductions are refreshed annually */
const ind = (scope: string, issued: string, by = "Maria Santos", expires?: string) => {
  const [y, m, d] = issued.split("-");
  return c("induction", issued, expires ?? `${Number(y) + 1}-${m}-${d}`, { scope, inductedBy: by });
};

function person(
  id: string,
  name: string,
  type: EmploymentType,
  level: AwardLevel,
  visa: Visa,
  availability: DayAvailability[],
  credentials: Credential[],
  extra: Partial<Staff> = {},
): Staff {
  return { id, name, type, level, visa, availability, credentials, ...extra };
}

const citizen: Visa = { type: "citizen" };
const pr: Visa = { type: "pr" };
const student = (prevWeekHours: number): Visa => ({ type: "student", prevWeekHours });

export const TENANTS: Tenant[] = [
  {
    id: "common",
    name: "Lobby, lifts & common areas",
    short: "Common areas",
    floors: "G to L2, lifts, amenities",
    sector: "Building owner",
    hue: 200,
    requirements: [],
    window: "Early clean 5am to 9am, day porter, evening touch-up",
  },
  {
    id: "ccco",
    name: "Commonwealth Cyber Coordination Office",
    short: "Cyber Office",
    floors: "L28 to L30",
    sector: "Federal government",
    hue: 0,
    requirements: [{ kind: "agsva", rank: 2 }, { kind: "induction", scope: "ccco" }],
    escort: { allowed: true, escorteeMinRank: 1 },
    window: "Weeknights 6pm to 10pm, closed public holidays",
    notes: "NV1 for unescorted access. Baseline holders may enter only when escorted by an NV1 holder for the whole shift.",
  },
  {
    id: "bank",
    name: "Southbank Mutual",
    short: "Southbank Mutual",
    floors: "L15 to L19",
    sector: "Banking",
    hue: 160,
    requirements: [{ kind: "police" }, { kind: "induction", scope: "bank" }],
    window: "Weeknights 6pm to 10:30pm, Saturday morning",
    notes: "Bank's own security induction plus a current police check. No escorts.",
  },
  {
    id: "law",
    name: "Harper Lowe Lawyers",
    short: "Harper Lowe",
    floors: "L10 to L14",
    sector: "Legal",
    hue: 260,
    requirements: [{ kind: "police" }],
    window: "Weeknights 6pm to 10pm",
    notes: "Privileged documents on desks. Police check required.",
  },
  {
    id: "childcare",
    name: "Little Explorers Early Learning",
    short: "Little Explorers",
    floors: "L1 mezzanine",
    sector: "Childcare",
    hue: 35,
    requirements: [{ kind: "wwc" }],
    window: "After 6:30pm weekdays, Saturday deep clean",
    notes: "Victorian Working with Children Check is a legal requirement.",
  },
  {
    id: "clinic",
    name: "Meridian Health Clinic",
    short: "Meridian Clinic",
    floors: "L3",
    sector: "Healthcare",
    hue: 300,
    requirements: [{ kind: "induction", scope: "clinic" }],
    window: "7pm to 11pm, Monday to Saturday incl. public holidays",
    notes: "Infection-control induction covers sharps and clinical waste handling.",
  },
  {
    id: "studio",
    name: "Kinfolk Studio",
    short: "Kinfolk Studio",
    floors: "L6 to L9",
    sector: "Technology",
    hue: 100,
    requirements: [],
    window: "Weeknights 5:30pm to 9:30pm",
  },
  {
    id: "comms",
    name: "Comms & data room",
    short: "Data room",
    floors: "B2",
    sector: "Building owner / carriers",
    hue: 220,
    requirements: [{ kind: "agsva", rank: 1 }, { kind: "induction", scope: "comms" }],
    escort: { allowed: true, escorteeMinRank: 0 },
    window: "Wednesday and Saturday, 10am to 2pm",
    notes: "Baseline clearance, or escorted by a Baseline holder. Anti-static induction required.",
  },
];

function shift(tenantId: string, day: DayIndex, from: string, to: string, slots: number, label: string): Shift {
  return { id: `${tenantId}-${day}-${from.replace(":", "")}`, tenantId, day, start: t(from), end: t(to), slots, label };
}

const WEEKDAYS: DayIndex[] = [0, 1, 2, 3, 4];
const ALL: DayIndex[] = [0, 1, 2, 3, 4, 5, 6];
const NOT_CUP: DayIndex[] = [0, 2, 3, 4]; // offices closed on Melbourne Cup Day

export const SHIFTS: Shift[] = [
  ...ALL.map((d) => shift("common", d, "05:00", "09:00", 2, "Early clean")),
  ...NOT_CUP.map((d) => shift("common", d, "09:00", "16:30", 1, "Day porter")),
  ...WEEKDAYS.map((d) => shift("common", d, "17:00", "21:00", 1, "Evening touch-up")),
  ...NOT_CUP.map((d) => shift("ccco", d, "18:00", "22:00", 2, "Secure floors")),
  ...NOT_CUP.map((d) => shift("bank", d, "18:00", "22:30", 2, "Banking floors")),
  shift("bank", 5, "08:00", "12:00", 1, "Weekend clean"),
  ...NOT_CUP.map((d) => shift("law", d, "18:00", "22:00", 2, "Office clean")),
  ...NOT_CUP.map((d) => shift("childcare", d, "18:30", "22:30", 1, "Centre clean")),
  shift("childcare", 5, "09:00", "13:00", 1, "Deep clean"),
  ...[0, 1, 2, 3, 4, 5].map((d) => shift("clinic", d as DayIndex, "19:00", "23:00", 1, "Clinical clean")),
  ...NOT_CUP.map((d) => shift("studio", d, "17:30", "21:30", 2, "Office clean")),
  shift("comms", 2, "10:00", "14:00", 1, "Data room"),
  shift("comms", 5, "10:00", "14:00", 2, "Data room"),
];

const S = "2026-02-09"; // common site-induction date

export const STAFF: Staff[] = [
  person("maria", "Maria Santos", "FT", 3, citizen, avail(["123456", "05:00", "23:00"]), [
    nv1("2021-05-10"), police("2025-01-20"), wwc("2023-03-01"),
    ind("site", "2026-01-12", "Facilities team"), ind("ccco", "2026-02-02", "CCCO security"), ind("bank", "2026-03-04", "Southbank security"),
    ind("clinic", "2026-03-11", "Meridian practice manager"), ind("comms", "2026-02-18", "Carrier NOC"),
  ], { role: "Site supervisor" }),
  person("tran", "Tran Nguyen", "FT", 2, pr, avail(["12345", "05:00", "23:00"]), [
    baseline("2022-08-01"), police("2024-06-11"), ind("site", S), ind("bank", "2026-03-04"), ind("comms", "2026-02-18"),
  ], { role: "Leading hand" }),
  person("peter", "Peter Kostas", "FT", 2, citizen, avail(["12345", "08:00", "17:00"]), [
    police("2024-09-02"), ind("site", S),
  ], { role: "Day porter" }),
  person("aisha", "Aisha Rahman", "PT", 2, citizen, avail(["12345", "17:00", "23:00"]), [
    nv1("2023-07-19"), police("2025-04-14"), wwc("2022-11-30"), ind("site", S), ind("ccco", "2026-02-02"),
  ], { agreedHours: 20 }),
  person("daniel", "Daniel Whitfield", "PT", 2, citizen, avail(["1234", "17:00", "23:00"]), [
    nv1("2020-02-03"), police("2024-02-26"), ind("site", S), ind("ccco", "2026-02-02"),
  ], { agreedHours: 16 }),
  person("grace", "Grace Okafor", "PT", 1, pr, avail(["12345", "17:00", "23:00"]), [
    police("2025-08-08"), wwc("2024-05-21"), ind("site", S),
  ], { agreedHours: 16 }),
  person("luca", "Luca Bianchi", "PT", 1, citizen, avail(["12345", "17:00", "23:00"], ["6", "07:00", "14:00"]), [
    police("2024-11-18"), ind("site", S), ind("bank", "2026-03-04"),
  ], { agreedHours: 16 }),
  person("meilin", "Mei Lin Zhou", "PT", 2, pr, avail(["2345", "09:00", "23:00"], ["6", "07:00", "15:00"]), [
    baseline("2023-04-03"), police("2025-02-10"), ind("site", S), ind("comms", "2026-02-18"), ind("clinic", "2026-03-11"),
  ], { agreedHours: 20 }),
  person("tom", "Tom Wilson", "PT", 1, citizen, avail(["67", "05:00", "13:00"], ["135", "05:00", "09:00"]), [
    police("2023-12-04"), ind("site", S),
  ], { agreedHours: 12 }),
  person("samuel", "Samuel Adeyemi", "CAS", 1, citizen, avail(["1234567", "05:00", "23:00"]), [
    police("2025-06-30"), ind("site", S), ind("clinic", "2026-03-11"),
  ]),
  person("hannah", "Hannah Brooks", "CAS", 1, citizen, avail(["12345", "16:00", "23:00"], ["6", "08:00", "14:00"]), [
    police("2024-03-12"), wwc("2021-09-15"), ind("site", S),
  ]),
  person("rohan", "Rohan Mehta", "CAS", 1, student(26), avail(["12345", "17:00", "23:00"]), [
    police("2025-03-03"), ind("site", S), ind("bank", "2026-03-04"),
  ]),
  person("jiwoo", "Ji-woo Park", "CAS", 1, student(20), avail(["123456", "17:00", "23:30"]), [
    police("2025-05-19"), ind("site", S), ind("clinic", "2026-03-11"),
  ]),
  person("priya", "Priya Sharma", "CAS", 1, student(32), avail(["12345", "17:00", "23:00"], ["6", "08:00", "14:00"]), [
    police("2025-07-07"), wwc("2025-07-01"), ind("site", S),
  ]),
  person("carlos", "Carlos Mendez", "CAS", 1, student(12), avail(["1234567", "05:00", "09:00"], ["12345", "17:00", "22:00"]), [
    ind("site", S),
  ]),
  person("fatima", "Fatima Noor", "CAS", 1, student(24), avail(["12345", "17:00", "23:00"]), [
    police("2025-09-15"), ind("site", S),
  ]),
  person("wei", "Wei Chen", "CAS", 1, student(18), avail(["12345", "17:00", "23:00"]), [
    police("2025-04-28"), ind("site", S), ind("bank", "2026-03-04"),
  ]),
  person("emma", "Emma Larsson", "CAS", 1, { type: "whm", whmSiteStart: "2026-05-25" }, avail(["12345", "16:00", "23:00"]), [
    ind("site", "2026-05-25"),
  ]),
  person("jack", "Jack O'Neill", "CAS", 1, { type: "whm", whmSiteStart: "2026-04-27" }, avail(["1234567", "05:00", "23:00"]), [
    police("2026-04-20"), ind("site", "2026-04-27"),
  ]),
  person("arjun", "Arjun Patel", "CAS", 2, { type: "graduate" }, avail(["123456", "09:00", "23:00"]), [
    baseline("2025-10-06"), police("2025-10-01"), ind("site", S), ind("comms", "2026-02-18"),
  ]),
  person("sophie", "Sophie Taylor", "CAS", 1, citizen, avail(["12345", "17:00", "23:00"]), [
    police("2024-08-19"), wwc("2021-11-10", "2026-11-10"), ind("site", S),
  ]),
  person("ben", "Ben Murphy", "CAS", 1, citizen, avail(["12345", "17:00", "23:00"]), [
    c("agsva", "2016-10-01", "2026-10-01", { rank: 2, note: "Revalidation pack not submitted" }), police("2025-01-13"), ind("site", S), ind("ccco", "2026-02-02"),
  ]),
  person("olivia", "Olivia Grant", "CAS", 1, citizen, avail(["12345", "17:00", "23:00"]), [
    police("2024-05-27"), ind("site", S), ind("bank", "2025-11-04", "Southbank security"),
  ]),
  person("kwame", "Kwame Mensah", "CAS", 2, pr, avail(["123456", "09:00", "23:30"]), [
    baseline("2024-02-12"), police("2024-02-01"), ind("site", S), ind("clinic", "2026-03-11"),
  ]),
  person("lucy", "Lucy Tran", "CAS", 1, citizen, avail(["12345", "17:00", "23:00"]), [
    police("2026-09-28"),
  ], { role: "New starter: site induction booked Wed 4 Nov" }),
  person("ana", "Ana Lima", "CAS", 1, pr, avail(["1234567", "05:00", "10:00"]), [
    police("2024-10-21"), ind("site", S),
  ]),
  person("hassan", "Hassan Ali", "CAS", 1, citizen, avail(["1234567", "05:00", "09:30"]), [
    ind("site", S),
  ]),
  person("nikolai", "Nikolai Petrov", "CAS", 1, citizen, avail(["1234567", "05:00", "09:30"], ["12345", "17:00", "21:00"]), [
    police("2025-02-17"), ind("site", S),
  ]),
];

export function seedState(): RosterState {
  return {
    weekStart: DEMO_WEEK,
    staff: STAFF,
    tenants: TENANTS,
    shifts: SHIFTS,
    assignments: {},
    contract: {
      name: "Collins Exchange Tower: commercial cleaning",
      client: "Collins Exchange Pty Ltd (building owner)",
      fyStart: "2026-07-01",
      annualHours: 15_600,
      annualLabourBudget: 741_000,
      ytdHours: 5_528,
      ytdCost: 262_800,
      ytdWeeks: 18,
    },
    settings: {
      courseInSession: true,
      superPct: 12,
      payrollTaxPct: 4.85,
      workcoverPct: 3.2,
    },
  };
}
