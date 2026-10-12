// lib/pricing.ts
//
// Single source of truth for engagement names, prices and phase numbering.
//
// WHY THIS EXISTS
// Prices and phase counts were previously restated independently in the
// pricing page data, the Pricing JSON-LD, llms.txt and the marketing copy.
// They drifted: the $2K AI Tools Assessment was added to /pricing and to the
// structured data but never reached the "three phases" narrative, so the site
// simultaneously published a three-phase and a four-phase engagement model.
//
// RULES
// 1. Numbers and tier names live here. Import them, never retype them.
// 2. Never hardcode a phase count in copy. Use PHASE_COUNT or phaseCountWord().
// 3. Prose that happens to quote a price (FAQ answers, body copy) is still
//    written by hand in the page data files. Those are listed in
//    PROSE_WITH_PRICES below so they can be checked when a price moves.
//
// OPEN DECISION: how many phases are we selling?
// The numbering below follows /pricing, which presents four phases with the
// AI Tools Assessment as Phase 01. /services presents a coherent three-phase
// model instead (Discovery, Build, Managed) and its data file exports only
// phase1/2/3Deliverables. Process.tsx, ai-consulting-melbourne and llms.txt
// also say "three phases". Both models are internally consistent, so this is a
// positioning call, not a typo, and it is deliberately left unresolved here:
//   Option A, Assessment is Phase 01 of four. Keep this numbering, renumber the
//     /services deliverables and update the "three phases" copy to use
//     phaseCountWord().
//   Option B, Assessment is a standalone entry product and the engagement model
//     is three phases. Set its `phase` to 0 (or drop it from PRICING_PHASES and
//     export it separately) and relabel it on /pricing.
// Until that is decided, PHASE_COUNT reflects Option A and the "three phases"
// copy has been left untouched rather than guessed at.
//
// NOT the source of truth for: /pricingdata, which publishes a different offer
// entirely (30-Day Pilot / Build Engagement / AI Ops Residency) and is
// currently noindexed pending reconciliation.

/** How a tier is charged. Ranges carry both bounds so structured data can
 *  express "from X to Y" instead of presenting the lower bound as the price. */
export type PriceShape =
  | { kind: "fixed"; amount: number }
  | { kind: "range"; min: number; max: number }
  | { kind: "monthlyRange"; min: number; max: number }
  /** Open-ended monthly floor, for a tier whose ceiling depends on usage. */
  | { kind: "monthlyFrom"; min: number }
  /** Day rate, booked as needed rather than committed monthly. */
  | { kind: "daily"; amount: number }
  /** Hourly floor, for small jobs quoted by the hour. */
  | { kind: "hourlyFrom"; min: number };

export type PricingPhase = {
  /** Stable key for lookups. Safe to use in analytics and URLs. */
  id: "assessment" | "discovery" | "build" | "managed";
  /** 1-indexed position in the engagement model. */
  phase: number;
  name: string;
  price: PriceShape;
  /** Display string used on the pricing page and in cards. */
  priceDisplay: string;
  /** Duration or cadence, as shown in tier meta. */
  duration: string;
  /** Whether the tier delivers something usable without any other phase. */
  standalone: boolean;
  /** Phase that must be completed first, if any. */
  requiresPhase?: number;
  /** One-line description for JSON-LD. Kept short and factual. */
  schemaDescription: string;
};

export const PRICING_PHASES: readonly PricingPhase[] = [
  {
    id: "assessment",
    phase: 1,
    name: "AI Tools Assessment",
    price: { kind: "fixed", amount: 2000 },
    priceDisplay: "AUD $2K",
    duration: "3 days",
    standalone: true,
    schemaDescription:
      "Three-day assessment. Where your week goes, what AI takes off your plate, and the maths behind it.",
  },
  {
    id: "discovery",
    phase: 2,
    name: "Discovery Sprint",
    price: { kind: "range", min: 5000, max: 15000 },
    priceDisplay: "AUD $5K–$15K",
    duration: "1–2 weeks",
    standalone: true,
    schemaDescription:
      "Scoped AI assessment. Understand your problem, map your data, define the build.",
  },
  {
    id: "build",
    phase: 3,
    name: "Build & Integrate",
    price: { kind: "range", min: 30000, max: 120000 },
    priceDisplay: "AUD $30K–$120K",
    duration: "4–6 weeks",
    standalone: false,
    requiresPhase: 2,
    schemaDescription:
      "Custom AI system built and integrated into your existing workflows.",
  },
  {
    id: "managed",
    phase: 4,
    name: "Managed Partnership",
    // No ceiling: the top support tier is a day rate booked as needed rather
    // than a committed monthly fee, so a range would be invented. The three
    // tiers in SUPPORT_TIERS carry the actual numbers immediately below this
    // on the pricing page, so nothing is hidden by the "from".
    price: { kind: "monthlyFrom", min: 1000 },
    priceDisplay: "From AUD $1K/mo",
    duration: "Ongoing",
    standalone: true,
    schemaDescription:
      "Monthly managed AI operations. Ongoing optimisation, support and training.",
  },
] as const;

/**
 * The three ongoing support tiers inside the Managed Partnership.
 *
 * Essential and Active are committed monthly retainers. Embedded is a day rate
 * booked as needed, deliberately not expressed as a monthly fee: at one week a
 * month it would land near Active's price for a similar number of hours, and
 * the two tiers would compete with each other instead of offering a real
 * choice between spread-out support and a concentrated block.
 *
 * The rate ladder declines with volume, which is the property to preserve when
 * any of these change. On an 8-hour day and a 4.33-week month:
 *   Essential  $1,000/mo   4.3 h/mo    ~$231/h
 *   Active     $6,000/mo   34.7 h/mo   ~$173/h
 *   Embedded   $1,200/day  8 h/day     ~$150/h
 *
 * Tier names are a first draft and worth reviewing. The numbers are as
 * supplied by the owner.
 */
export type SupportTier = {
  id: "essential" | "active" | "embedded";
  name: string;
  /** Monthly for the committed tiers, daily for the embedded engagement. */
  price: PriceShape;
  priceDisplay: string;
  /** The time commitment, in the client's terms. */
  commitment: string;
  summary: string;
};

/** Assumed length of a billed day, used only to sanity-check the rate ladder. */
export const HOURS_PER_DAY = 8;

export const SUPPORT_TIERS: readonly SupportTier[] = [
  {
    id: "essential",
    name: "Essential",
    price: { kind: "monthlyFrom", min: 1000 },
    priceDisplay: "AUD $1K/mo",
    commitment: "1 hour per week",
    summary:
      "Ongoing support and training for a system your team already runs day to day.",
  },
  {
    id: "active",
    name: "Active",
    price: { kind: "monthlyFrom", min: 6000 },
    priceDisplay: "AUD $6K/mo",
    commitment: "8 hours per week",
    summary:
      "Sustained support, training and improvement time against the system's original success metric.",
  },
  {
    id: "embedded",
    name: "Embedded",
    price: { kind: "daily", amount: 1200 },
    priceDisplay: "AUD $1,200/day",
    commitment: "Full engagement, booked by the day",
    summary:
      "We work alongside your team full time for the days you book, setting up infrastructure and building internal capability.",
  },
] as const;

/**
 * Hourly rate for small, well-defined jobs that don't warrant a phased
 * engagement: website changes, a single automation, tool setup, training.
 *
 * Deliberately NOT one of PRICING_PHASES, so PHASE_COUNT and the "N phases"
 * copy are unaffected. It is a "from" price because the support tiers above
 * work out at more per hour for committed, on-call cover; small project work
 * is the floor, not the only rate.
 *
 * The quote skill (~/.claude/skills/quote) syncs this value, so change it
 * here rather than in the skill.
 */
export const HOURLY_RATE = {
  id: "hourly",
  name: "Hourly work",
  price: { kind: "hourlyFrom", min: 100 },
  priceDisplay: "From AUD $100/hr",
  schemaDescription:
    "Small, well-defined jobs quoted by the hour: website changes, single automations, tool setup and training.",
} as const satisfies {
  id: string;
  name: string;
  price: PriceShape;
  priceDisplay: string;
  schemaDescription: string;
};

/**
 * SEO and AEO (answer engine optimisation) retainers: being found on Google
 * and being cited by AI assistants. Every tier covers both.
 *
 * Priced at the HOURLY_RATE floor for the included hours, so the ladder is
 * flat per hour by design: the step up buys more output (articles, pages,
 * tracked questions), not a cheaper rate. Like HOURLY_RATE these are offers,
 * not phases, so they sit outside PRICING_PHASES.
 *
 * The quote skill (~/.claude/skills/quote) syncs these values.
 */
export type SeoAeoTier = {
  id: "foundation" | "growth" | "authority";
  name: string;
  price: PriceShape;
  priceDisplay: string;
  hoursPerMonth: number;
  bestFor: string;
  includes: readonly string[];
  schemaDescription: string;
};

export const SEO_AEO_MIN_TERM_MONTHS = 3;

export const SEO_AEO_TIERS: readonly SeoAeoTier[] = [
  {
    id: "foundation",
    name: "SEO & AEO Foundation",
    price: { kind: "monthlyFrom", min: 500 },
    priceDisplay: "AUD $500/mo",
    hoursPerMonth: 5,
    bestFor: "One location, getting the basics right",
    includes: [
      "Technical SEO fixes",
      "Google Business Profile kept current",
      "Schema markup and llms.txt maintained for AI search",
      "Monthly ranking and AI-citation check on 10 target questions",
      "One-page monthly report",
    ],
    schemaDescription:
      "Monthly SEO and AI search basics for a single-location business.",
  },
  {
    id: "growth",
    name: "SEO & AEO Growth",
    price: { kind: "monthlyFrom", min: 1000 },
    priceDisplay: "AUD $1,000/mo",
    hoursPerMonth: 10,
    bestFor: "Competing in a busy local market",
    includes: [
      "Everything in Foundation",
      "2 articles a month written to be cited by AI answers",
      "Internal linking improvements",
      "Review response templates",
      "Tracking on 25 target questions",
    ],
    schemaDescription:
      "Monthly SEO and AI search with two articles a month written to be cited by AI answers.",
  },
  {
    id: "authority",
    name: "SEO & AEO Authority",
    price: { kind: "monthlyFrom", min: 1500 },
    priceDisplay: "AUD $1,500/mo",
    hoursPerMonth: 15,
    bestFor: "Multiple locations or service areas",
    includes: [
      "Everything in Growth",
      "4 articles a month",
      "Location and service-area pages",
      "Tracking against 3 competitors",
      "Quarterly strategy call",
    ],
    schemaDescription:
      "Monthly SEO and AI search for multi-location businesses, with location pages and competitor tracking.",
  },
] as const;

/** Number of phases in the published engagement model. Derive, never retype. */
export const PHASE_COUNT = PRICING_PHASES.length;

const COUNT_WORDS = ["zero", "one", "two", "three", "four", "five", "six"];

/** Phase count as a word, for copy: `${phaseCountWord()} phases`. */
export function phaseCountWord(): string {
  return COUNT_WORDS[PHASE_COUNT] ?? String(PHASE_COUNT);
}

export function pricingPhaseById(id: PricingPhase["id"]): PricingPhase {
  const phase = PRICING_PHASES.find((p) => p.id === id);
  if (!phase) {
    throw new Error(`Unknown pricing phase: ${id}`);
  }
  return phase;
}

/** Lower bound of a tier, for sorting or "from" copy. */
export function priceFrom(price: PriceShape): number {
  switch (price.kind) {
    case "fixed":
    case "daily":
      return price.amount;
    case "range":
    case "monthlyRange":
    case "monthlyFrom":
    case "hourlyFrom":
      return price.min;
  }
}

/**
 * Files containing hand-written prose that quotes a price or a phase number.
 * These cannot be generated from this module without flattening the copy, so
 * grep them when any number above changes.
 */
export const PROSE_WITH_PRICES = [
  "app/(site)/(main)/pricing/data.ts",
  "app/(site)/(main)/services/data.ts",
  "app/(site)/(main)/process/data.ts",
  "app/(site)/(main)/ai-consulting-melbourne/page.tsx",
] as const;
