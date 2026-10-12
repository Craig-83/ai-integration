/**
 * Dev-only stress fixtures for the Roster Guard demo (break-ui).
 *
 * Same shape as seedState(), filled with the realistic worst case instead of
 * kind demo data: long and short names, diacritics, CJK, duplicate names,
 * a 60+ person staff list, long tenant names with every requirement at once,
 * an 8-cleaner shift, an overnight shift, a week with two public holidays
 * that crosses the new year, credentials expiring mid-week, and an annual
 * contract in the millions. Also an Empty and a One state.
 *
 * Loaded only behind the dev toggle (?data=worst|empty|one). Never imported
 * by production code paths.
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

/** Mon 28 Dec 2026 (Boxing Day additional) to Sun 3 Jan 2027, New Year's Day on the Friday. */
export const WORST_WEEK = "2026-12-28";

const t = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const ANY: DayAvailability[] = [0, 1, 2, 3, 4, 5, 6].map(() => [t("05:00"), t("23:59")]);
const EVENINGS: DayAvailability[] = [[t("16:00"), t("23:30")], [t("16:00"), t("23:30")], [t("16:00"), t("23:30")], [t("16:00"), t("23:30")], [t("16:00"), t("23:30")], null, null];
const EARLIES: DayAvailability[] = [0, 1, 2, 3, 4, 5, 6].map(() => [t("04:30"), t("10:00")]);

let seq = 0;
const c = (kind: Credential["kind"], issued: string, expires?: string, extra: Partial<Credential> = {}): Credential => ({
  id: `w${++seq}`,
  kind,
  issued,
  expires,
  ...extra,
});

const TENANTS: Tenant[] = [
  {
    id: "lobby",
    name: "Lobby, lifts, end-of-trip facilities and common areas",
    short: "Common areas and end-of-trip",
    floors: "G to L2, lifts 1 to 12, B1 end-of-trip, loading dock",
    sector: "Building owner",
    hue: 200,
    requirements: [],
    window: "Early clean 5am to 9am, day porter, evening touch-up",
  },
  {
    id: "dfat",
    name: "Department of Foreign Affairs and Trade, Consular Emergency Centre (Melbourne)",
    short: "DFAT Consular Emergency Centre",
    floors: "L20 to L27, plus B3 secure store",
    sector: "Federal government",
    hue: 0,
    requirements: [{ kind: "agsva", rank: 3 }, { kind: "police" }, { kind: "induction", scope: "dfat" }],
    escort: { allowed: true, escorteeMinRank: 2 },
    window: "Weeknights 6pm to 2am, closed public holidays except during an activated crisis response",
    notes:
      "NV2 for unescorted access to L24 to L27. NV1 holders may enter only when escorted by an NV2 holder for the whole shift. Phones and smart watches are lodged at the L20 airlock. Classified waste is handled by DFAT staff only: never empty the red bins.",
  },
  {
    id: "bp",
    name: "BP",
    short: "BP",
    floors: "L5",
    sector: "Energy",
    hue: 120,
    requirements: [],
    window: "Weeknights",
  },
  {
    id: "vpb",
    name: "Ngân hàng Thương mại Cổ phần Việt Nam Thịnh Vượng, Văn phòng Đại diện tại Melbourne",
    short: "VPBank Văn phòng Đại diện",
    floors: "L4 (east wing)",
    sector: "Banking",
    hue: 160,
    requirements: [{ kind: "police" }, { kind: "induction", scope: "vpb" }],
    window: "Weeknights 6pm to 10:30pm",
    notes: "Bank's own security induction plus a current police check. No escorts.",
  },
  {
    id: "kids",
    name: "Little Explorers Early Learning Centre and Out of School Hours Care",
    short: "Little Explorers ELC & OSHC",
    floors: "L1 mezzanine and rooftop play deck",
    sector: "Childcare",
    hue: 35,
    requirements: [{ kind: "wwc" }, { kind: "police" }, { kind: "induction", scope: "kids" }],
    window: "After 6:30pm weekdays, Saturday deep clean",
    notes: "Victorian Working with Children Check is a legal requirement.",
  },
  {
    id: "law",
    name: "Harper Lowe Fitzgerald-Montgomery & Associates Lawyers",
    short: "Harper Lowe Fitzgerald-Montgomery",
    floors: "L10 to L14",
    sector: "Legal",
    hue: 260,
    requirements: [{ kind: "police" }],
    window: "Weeknights 6pm to 10pm",
  },
  {
    id: "surgery",
    name: "Meridian Health Clinic and Day Surgery",
    short: "Meridian Day Surgery",
    floors: "L3",
    sector: "Healthcare",
    hue: 300,
    requirements: [{ kind: "police" }, { kind: "wwc" }, { kind: "induction", scope: "surgery" }],
    window: "7pm to 11pm, Monday to Saturday incl. public holidays",
  },
  {
    id: "mizuho",
    name: "みずほ銀行 メルボルン駐在員事務所",
    short: "みずほ銀行",
    floors: "L15",
    sector: "Banking",
    hue: 220,
    requirements: [{ kind: "police" }],
    window: "Weeknights 6pm to 10pm",
  },
  {
    id: "data",
    name: "Comms & data room",
    short: "Data room",
    floors: "B2",
    sector: "Building owner / carriers",
    hue: 60,
    requirements: [{ kind: "agsva", rank: 1 }, { kind: "induction", scope: "data" }],
    escort: { allowed: true, escorteeMinRank: 0 },
    window: "Wednesday and Saturday, 10am to 2pm",
  },
];

function shift(tenantId: string, day: DayIndex, from: string, to: string, slots: number, label: string, extra: Partial<Shift> = {}): Shift {
  let end = t(to);
  if (end <= t(from)) end += 24 * 60; // overnight, finishes the next morning
  return { id: `${tenantId}-${day}-${from.replace(":", "")}`, tenantId, day, start: t(from), end, slots, label, ...extra };
}

const WEEKDAYS: DayIndex[] = [0, 1, 2, 3, 4];
const ALL: DayIndex[] = [0, 1, 2, 3, 4, 5, 6];

const SHIFTS: Shift[] = [
  // Monday is a public holiday and still gets the full 8-cleaner early crew
  shift("lobby", 0, "05:00", "09:00", 8, "Early clean, full crew after the Christmas shutdown"),
  ...ALL.filter((d) => d !== 0).map((d) => shift("lobby", d, "05:00", "09:00", 3, "Early clean")),
  ...WEEKDAYS.map((d) => shift("lobby", d, "06:00", "07:00", 1, "Bins")),
  ...WEEKDAYS.map((d) => shift("lobby", d, "09:00", "16:30", 1, "Day porter")),
  ...WEEKDAYS.map((d) => shift("lobby", d, "17:00", "21:00", 2, "Evening touch-up")),
  ...WEEKDAYS.map((d) => shift("dfat", d, "18:00", "22:00", 4, "Secure floors L24 to L27")),
  shift("dfat", 2, "22:00", "02:00", 2, "Overnight secure floors (crisis response activated)"),
  ...WEEKDAYS.map((d) => shift("bp", d, "18:00", "22:00", 1, "Clean")),
  ...WEEKDAYS.map((d) => shift("vpb", d, "18:00", "22:30", 2, "Banking floors")),
  ...WEEKDAYS.map((d) => shift("kids", d, "18:30", "22:30", 2, "Centre clean")),
  shift("kids", 5, "09:00", "13:00", 3, "Deep clean incl. rooftop play deck and nappy change rooms"),
  ...WEEKDAYS.map((d) => shift("law", d, "18:00", "22:00", 2, "Office clean")),
  shift("law", 2, "10:00", "16:00", 4, "Post-fit-out builders' clean, L12 kitchen, boardroom and breakout (client request)", { chargeable: true }),
  ...[0, 1, 2, 3, 4, 5].map((d) => shift("surgery", d as DayIndex, "19:00", "23:00", 2, "Clinical clean")),
  ...WEEKDAYS.map((d) => shift("mizuho", d, "18:00", "22:00", 1, "Office clean")),
  shift("data", 2, "10:00", "14:00", 1, "Data room"),
  shift("data", 5, "10:00", "14:00", 2, "Data room"),
];

/** The names that break layouts, spread through the list so several are on screen at once. */
const HARD: [string, EmploymentType, AwardLevel, Visa, Partial<Staff>, Credential[]][] = [
  ["Aleksandra Wiśniewska-Kowalczyk", "FT", 3, { type: "citizen" }, { role: "Site supervisor, after-hours key holder and DFAT escort (NV2)" }, [
    c("agsva", "2019-03-01", "2034-03-01", { rank: 3 }), c("police", "2025-01-20", "2028-01-20"), c("wwc", "2023-03-01", "2028-03-01"),
    c("induction", "2026-01-12", "2027-01-12", { scope: "site", inductedBy: "Commonwealth Protective Security Officer on duty (DFAT Melbourne)" }),
    c("induction", "2026-02-02", "2027-02-02", { scope: "dfat", inductedBy: "DFAT agency security adviser" }),
    c("induction", "2026-03-04", "2027-03-04", { scope: "vpb" }), c("induction", "2026-03-11", "2027-03-11", { scope: "surgery" }),
    c("induction", "2026-02-18", "2027-02-18", { scope: "data" }), c("induction", "2026-02-18", "2027-02-18", { scope: "kids" }),
  ]],
  ["Jo", "CAS", 1, { type: "citizen" }, {}, [c("police", "2025-06-30", "2028-06-30"), c("induction", "2026-02-09", "2027-02-09", { scope: "site" })]],
  ["Nguyen Thi Minh Khai", "PT", 2, { type: "pr" }, { agreedHours: 38 }, [
    c("agsva", "2022-08-01", "2026-12-30", { rank: 2, note: "Revalidation pack submitted 14 Nov 2026, awaiting AGSVA decision (ref AGSVA-2026-0412873)" }),
    c("police", "2023-12-29", "2026-12-29"), c("induction", "2025-12-31", "2026-12-31", { scope: "site" }), c("induction", "2026-02-02", "2027-02-02", { scope: "dfat" }),
  ]],
  ["Christopher Alexander Montgomery III", "FT", 2, { type: "citizen" }, { role: "Leading hand" }, [
    c("agsva", "2021-05-10", "2034-01-01", { rank: 3 }), c("police", "2024-06-11", "2027-06-11"), c("induction", "2026-02-09", "2027-02-09", { scope: "site" }), c("induction", "2026-02-02", "2027-02-02", { scope: "dfat" }),
  ]],
  ["Đặng Thị Ngọc Hân", "CAS", 1, { type: "student", prevWeekHours: 30 }, {}, [c("police", "2025-05-19", "2028-05-19"), c("induction", "2026-02-09", "2027-02-09", { scope: "site" })]],
  ["王秀英", "CAS", 1, { type: "student", prevWeekHours: 48 }, {}, [c("police", "2025-04-28", "2028-04-28"), c("induction", "2026-02-09", "2027-02-09", { scope: "site" }), c("induction", "2026-03-04", "2027-03-04", { scope: "vpb" })]],
  [" Sam Lee", "CAS", 1, { type: "citizen" }, { role: "Imported from payroll CSV" }, [c("induction", "2026-02-09", "2027-02-09", { scope: "site" })]],
  ["María José de la Cruz y Fernández", "PT", 2, { type: "whm", whmSiteStart: "2026-05-04" }, { agreedHours: 24 }, [c("police", "2026-04-20", "2029-04-20"), c("induction", "2026-05-04", "2027-05-04", { scope: "site" })]],
  ["Seán O'Brien-Ó Súilleabháin", "CAS", 1, { type: "citizen" }, {}, [c("police", "2024-03-12", "2027-03-12"), c("wwc", "2021-09-15", "2026-12-27"), c("induction", "2026-02-09", "2027-02-09", { scope: "site" })]],
  ["Konstantin Oberhauser-Wettstein", "CAS", 2, { type: "graduate" }, {}, [c("agsva", "2025-10-06", "2038-01-01", { rank: 1 }), c("police", "2025-10-01", "2028-10-01"), c("induction", "2026-02-09", "2027-02-09", { scope: "site" }), c("induction", "2026-02-18", "2027-02-18", { scope: "data" })]],
  ["Daniel Nguyen", "CAS", 1, { type: "citizen" }, {}, [c("police", "2025-01-13", "2028-01-13"), c("induction", "2026-02-09", "2027-02-09", { scope: "site" })]],
  ["Daniel Nguyen", "PT", 1, { type: "pr" }, { agreedHours: 12 }, [c("induction", "2026-02-09", "2027-02-09", { scope: "site" })]],
  ["Ólafur Darri Ólafsson", "CAS", 1, { type: "whm", whmSiteStart: "2026-11-30" }, {}, [c("induction", "2026-11-30", "2027-11-30", { scope: "site" })]],
  ["Balasubramaniam Venkataraghavan", "FT", 2, { type: "citizen" }, { role: "Day porter" }, [c("police", "2024-09-02", "2027-09-02"), c("wwc", "2024-05-21", "2029-05-21"), c("induction", "2026-02-09", "2027-02-09", { scope: "site" }), c("induction", "2026-02-18", "2027-02-18", { scope: "kids" })]],
  ["Siosaia Taufa'ahau Tupou-Fifita", "CAS", 1, { type: "citizen" }, {}, []],
  ["dana", "CAS", 1, { type: "citizen" }, { role: "New starter: site induction booked Tue 29 Dec" }, [c("police", "2026-12-01", "2029-12-01")]],
];

const FIRST = ["Mohammed", "Thanh", "Priya", "Liam", "Zoe", "Arjun", "Mei", "Oliver", "Fatima", "Kwame", "Lucia", "Ravi", "Hannah", "Tomasz", "Aroha", "Yusuf", "Ingrid", "Chen", "Grace", "Mateo", "Leilani", "Dmitri", "Amara", "Kenji"];
const LAST = ["Al-Rashidi", "Pham", "Raghunathan", "O'Connor", "Papadopoulos", "Kaur", "Zhou", "Whitfield", "Haddad", "Mensah", "Bianchi", "Iyer", "Brooks", "Kowalski", "Ngata", "Demir", "Johansson", "Wang", "Okafor", "Fernández", "Kealoha", "Volkov", "Eze", "Takahashi"];

function staffList(): Staff[] {
  const hard: Staff[] = HARD.map(([name, type, level, visa, extra, credentials], i) => ({
    id: `h${i}`,
    name,
    type,
    level,
    visa,
    availability: i % 3 === 0 ? ANY : i % 3 === 1 ? EVENINGS : EARLIES,
    credentials,
    ...extra,
  }));
  const filler: Staff[] = Array.from({ length: 48 }, (_, i) => {
    const type: EmploymentType = i % 7 === 0 ? "FT" : i % 3 === 0 ? "PT" : "CAS";
    const visa: Visa = i % 5 === 0 ? { type: "student", prevWeekHours: 10 + (i % 30) } : i % 11 === 0 ? { type: "whm", whmSiteStart: "2026-08-03" } : { type: i % 2 ? "citizen" : "pr" };
    const credentials: Credential[] = [c("induction", "2026-02-09", "2027-02-09", { scope: "site" })];
    if (i % 4 !== 3) credentials.push(c("police", "2025-02-17", "2028-02-17"));
    if (i % 6 === 0) credentials.push(c("wwc", "2024-01-15", "2029-01-15"), c("induction", "2026-02-18", "2027-02-18", { scope: "kids" }));
    if (i % 9 === 0) credentials.push(c("agsva", "2023-07-19", "2034-01-01", { rank: 2 }), c("induction", "2026-02-02", "2027-02-02", { scope: "dfat" }));
    if (i % 8 === 0) credentials.push(c("induction", "2026-03-04", "2027-03-04", { scope: "vpb" }), c("induction", "2026-03-11", "2027-03-11", { scope: "surgery" }));
    return {
      id: `f${i}`,
      name: `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`,
      type,
      level: ((i % 3) + 1) as AwardLevel,
      visa,
      agreedHours: type === "PT" ? 16 + (i % 4) * 4 : undefined,
      availability: i % 2 ? EVENINGS : ANY,
      credentials,
    };
  });
  return [...hard, ...filler];
}

/** Hand-built like a spreadsheet: every slot filled in rotation, a few left open, one shift overstaffed. */
function assign(staff: Staff[], shifts: Shift[]): Record<string, string[]> {
  const a: Record<string, string[]> = {};
  let k = 0;
  shifts.forEach((sh, i) => {
    const n = i % 9 === 4 ? Math.max(0, sh.slots - 1) : sh.slots; // some shifts short
    a[sh.id] = Array.from({ length: n }, () => staff[k++ % staff.length].id);
  });
  // The 8-cleaner crew is all hard names, so the widest avatars and initials sit together
  a["lobby-0-0500"] = ["h0", "h1", "h2", "h3", "h4", "h5", "h6", "h7"];
  // Overstaffed: 3 people on a 1-person shift
  a["bp-1-1800"] = ["h10", "h11", "f3"];
  // Overnight shift nobody picked up
  a["dfat-2-2200"] = [];
  return a;
}

export function worstState(): RosterState {
  const staff = staffList();
  return {
    weekStart: WORST_WEEK,
    staff,
    tenants: TENANTS,
    shifts: SHIFTS,
    assignments: assign(staff, SHIFTS),
    contract: {
      name: "Collins Exchange Tower and 101 Collins Street Podium: integrated commercial, secure-area and childcare cleaning",
      client: "Collins Exchange Holdings Pty Ltd ATF Collins Exchange Unit Trust (building owner)",
      fyStart: "2026-07-01",
      annualHours: 124_800,
      annualLabourBudget: 6_480_000,
      ytdHours: 63_412,
      ytdCost: 3_291_740,
      ytdWeeks: 26,
    },
    settings: { courseInSession: true, superPct: 12, payrollTaxPct: 4.85, workcoverPct: 3.2 },
  };
}

/** A new account: no tenants, no staff, no shifts, nothing spent yet. */
export function emptyState(): RosterState {
  return {
    weekStart: "2026-11-02",
    staff: [],
    tenants: [],
    shifts: [],
    assignments: {},
    contract: {
      name: "New contract",
      client: "",
      fyStart: "2026-07-01",
      annualHours: 0,
      annualLabourBudget: 0,
      ytdHours: 0,
      ytdCost: 0,
      ytdWeeks: 0,
    },
    settings: { courseInSession: true, superPct: 12, payrollTaxPct: 4.85, workcoverPct: 3.2 },
  };
}

/** Exactly one of everything: one tenant, one cleaner, one shift, one credential expiring, one week of history. */
export function oneState(): RosterState {
  const sh: Shift = { id: "one-0-1800", tenantId: "one", day: 0, start: t("18:00"), end: t("22:00"), slots: 1, label: "Office clean" };
  return {
    weekStart: "2026-11-02",
    staff: [
      {
        id: "s1",
        name: "Priya Sharma",
        type: "PT",
        level: 1,
        visa: { type: "citizen" },
        agreedHours: 1,
        availability: EVENINGS,
        credentials: [c("induction", "2025-11-05", "2026-11-05", { scope: "site" })],
      },
    ],
    tenants: [{ id: "one", name: "Kinfolk Studio", short: "Kinfolk Studio", floors: "L6", sector: "Technology", hue: 100, requirements: [], window: "Weeknights" }],
    shifts: [sh],
    assignments: { [sh.id]: ["s1"] },
    contract: {
      name: "Kinfolk Studio: office cleaning",
      client: "Kinfolk Studio Pty Ltd",
      fyStart: "2026-07-01",
      annualHours: 208,
      annualLabourBudget: 10_400,
      ytdHours: 4,
      ytdCost: 200,
      ytdWeeks: 1,
    },
    settings: { courseInSession: true, superPct: 12, payrollTaxPct: 4.85, workcoverPct: 3.2 },
  };
}

export function devFixture(id: "worst" | "empty" | "one"): RosterState {
  return id === "worst" ? worstState() : id === "empty" ? emptyState() : oneState();
}
