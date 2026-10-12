/**
 * Cleaning Services Award 2020 (MA000022), rates from the first full pay
 * period on or after 1 July 2026 (2026 Annual Wage Review, +4.75%).
 *
 * All multipliers are a percentage of the full-time ordinary hourly rate,
 * which is how the award's Table 7 expresses them: the part-time (15%) and
 * casual (25%) loadings are already folded in.
 */
import type { AwardLevel, EmploymentType } from "./types";

export const RATES_AS_AT = "1 July 2026";
export const AWARD_NAME = "Cleaning Services Award 2020 (MA000022)";

export const BASE_HOURLY: Record<AwardLevel, number> = {
  1: 27.08,
  2: 27.97,
  3: 29.45,
};

type Table = Record<EmploymentType, number>;

export const ORDINARY: {
  weekday: Table;
  /** Mon-Fri shift starting before 6am or finishing after 6pm */
  weekdayShift: Table;
  saturday: Table;
  sunday: Table;
  publicHoliday: Table;
} = {
  weekday: { FT: 1.0, PT: 1.15, CAS: 1.25 },
  weekdayShift: { FT: 1.15, PT: 1.3, CAS: 1.4 },
  saturday: { FT: 1.5, PT: 1.65, CAS: 1.75 },
  sunday: { FT: 2.0, PT: 2.15, CAS: 2.25 },
  publicHoliday: { FT: 2.5, PT: 2.65, CAS: 2.75 },
};

export const OVERTIME = {
  /** Mon-Sat, first 2 hours of overtime in a day */
  first2: { FT: 1.5, PT: 1.5, CAS: 1.75 } as Table,
  after2: { FT: 2.0, PT: 2.0, CAS: 2.25 } as Table,
  sunday: { FT: 2.0, PT: 2.0, CAS: 2.25 } as Table,
  publicHoliday: { FT: 2.5, PT: 2.5, CAS: 2.75 } as Table,
};

/** Overtime triggers (cl 19). FT daily limit assumes a 10-hour-day agreement. */
export const LIMITS = {
  weeklyOrdinary: 38,
  dailyOrdinary: { FT: 10, PT: 7.6, CAS: 7.6 } as Table,
  maxOrdinaryDays: { FT: 5, PT: 5, CAS: 5 } as Table,
  /** Hours off between shifts before overtime rates apply (cl 14.4) */
  minBreakHours: 8,
  /** Minimum engagement for PT and casual at sites of 5,000 sqm or more (cl 13.5(c)) */
  minEngagementHours: 4,
};

export const STUDENT_FORTNIGHT_CAP = 48;
export const WHM_MONTHS = 6;

export const TYPE_LABEL: Record<EmploymentType, string> = {
  FT: "Full-time",
  PT: "Part-time",
  CAS: "Casual",
};
