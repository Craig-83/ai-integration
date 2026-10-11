// Page copy/data for pricing - extracted from page.tsx to keep the
// component readable. Edit copy here; edit layout in page.tsx.
//
// Tier names, prices, phase numbers and durations come from lib/pricing.ts so
// this page, the Pricing JSON-LD and llms.txt cannot disagree. Only the
// editorial copy below is written by hand. If you change a price, change it
// there and grep PROSE_WITH_PRICES for prose that quotes the old number.

import {
  HOURLY_RATE,
  pricingPhaseById,
  SEO_AEO_MIN_TERM_MONTHS,
  SEO_AEO_TIERS,
  SUPPORT_TIERS,
} from "@/lib/pricing";
import {
  MODEL_USAGE,
  RESPONSE_COMMITMENTS,
  SUPPORT_HOURS,
  WARRANTY,
} from "@/lib/support";

const assessment = pricingPhaseById("assessment");
const discovery = pricingPhaseById("discovery");
const build = pricingPhaseById("build");
const managed = pricingPhaseById("managed");

const phaseLabel = (n: number) => `Phase ${String(n).padStart(2, "0")}`;

export const faqs = [
  {
    q: "Is there flexibility in the pricing?",
    a: "The AI Tools Assessment is a flat AUD $2,000. Beyond that, the price ranges reflect real variation in engagement complexity. A Discovery Sprint for a single process with a clean tech stack costs less than one scoping multiple integrations across a complex stack. Build & Integrate pricing is fixed once the Discovery Sprint is complete - no surprises from that point. We don't negotiate on price for the same scope.",
  },
  {
    q: "What if the assessment doesn't find five hours a week?",
    a: "Then you don't pay. If the assessment doesn't identify at least five hours a week we can give you back, you get all $2,000 returned. The recommendations are in writing, with the hours and the maths on the page, so you can see exactly what you're getting before you spend a cent on tools.",
  },
  {
    q: "Do we need to do all four phases?",
    a: "No. The AI Tools Assessment and the Discovery Sprint both stand alone - each one ends with something you own and can act on without us. Build & Integrate requires a Discovery Sprint because the scope and fixed price are determined there. The Managed Partnership is optional - many clients run their system independently after the build.",
  },
  {
    q: "What's the difference between the Assessment and the Discovery Sprint?",
    a: "The AI Tools Assessment looks across your whole week and finds the hours you can get back quickly - mostly with tools and automations you can switch on yourself. The Discovery Sprint goes deep on one specific business problem and produces a system design and a fixed-price build proposal. Start with the Assessment if you want fast wins and a map. Start with the Sprint if you already know the problem you want solved.",
  },
  {
    q: "What if the system doesn't hit the success metric?",
    a: "We define the success metrics together in the Discovery Sprint. If Build & Integrate doesn't hit them, we stay involved until it does. That's part of what the 95% outcome rate means - we don't declare something done until the outcome is real.",
  },
  {
    q: "Can we start with a smaller engagement?",
    a: "Yes. The AI Tools Assessment is AUD $2,000 and takes three days. It's the lowest-risk way to find out where your time is going and what AI would actually take off your plate - and if we don't find you five hours a week, you get the $2,000 back. For a small, well-defined job, we also work by the hour from AUD $100 an hour.",
  },
  {
    q: "What is AEO, and do I need it as well as SEO?",
    a: `AEO stands for answer engine optimisation: making your business the one AI assistants such as ChatGPT, Claude, Perplexity and Google's AI Overviews name when someone asks for a recommendation. It builds on SEO rather than replacing it, which is why every tier covers both. Packages start at ${SEO_AEO_TIERS[0].priceDisplay} with a ${SEO_AEO_MIN_TERM_MONTHS}-month minimum.`,
  },
  {
    q: "Do you take on small jobs by the hour?",
    a: "Yes, from AUD $100 an hour. It suits work that is small and clearly defined: changes to your website, a single automation, setting up Claude or Copilot for your team, or a training session. We quote the hours up front, task by task, so you know the total before we start. Anything bigger or less certain goes through a Discovery Sprint so the price can be fixed.",
  },
  {
    q: "What's your capacity?",
    a: "We take a limited number of engagements at any one time. If we're at capacity, we'll tell you when we can start and give you the option of being on the list. We don't rush engagements to fit more in - that's how 95% outcome rates drop.",
  },
  {
    q: "Do you work with businesses outside Melbourne?",
    a: "Yes. Assessments and Discovery Sprints are mostly remote - we can run them anywhere. For builds requiring on-site work, we travel. We've worked with businesses across Australia.",
  },
];

export const phases = [
  {
    num: phaseLabel(assessment.phase),
    title: assessment.name,
    price: assessment.priceDisplay,
    meta: `${assessment.duration} · Can stand alone`,
    body: "Every business has a week hidden inside it. The AI Tools Assessment finds yours. We map where your team's time actually goes, then match each recurring task to the thing that removes it - tools you can switch on this week, workflows we can automate in days, and the larger systems worth building later. You get it in writing, with the hours and the maths on the page, plus a four-day start plan you can run without us.",
    callout: "We'll find you five hours a week, or you don't pay.",
    noteLabel: "Our guarantee",
    priceNote: [
      "If the assessment doesn't identify at least five hours a week we can give you back, you get all $2,000 returned. The recommendations are in writing, with the hours and the maths on the page, so you can see exactly what you're getting before you spend a cent on tools.",
    ],
    deliverables: [
      "Your week quantified - every recurring task, in hours",
      "Opportunity map ranking each one by impact against effort",
      "Every task matched to a specific tool or system, with real costs",
      "Four-day start plan - ten minutes a day, no technical help needed",
      "The financial case: hours back, dollars saved, payback period",
      "Recommendations for the larger builds worth doing later",
      "Yours to keep - no lock-in, no obligation to build with us",
    ],
  },
  {
    num: phaseLabel(discovery.phase),
    title: discovery.name,
    price: discovery.priceDisplay,
    meta: `${discovery.duration} · Can stand alone`,
    body: "The Discovery Sprint is a scoped investigation into your specific business problem. We spend 1–2 weeks understanding your processes, your stack, and the opportunity. We come out with a specific system design, agreed success metrics, a go/no-go recommendation, and a fixed-price Phase 3 proposal if we both want to proceed. The plan is yours - no obligation to proceed with us.",
    priceNote: [
      "Lower ($5K): single process, clear brief, simple tech stack",
      "Upper ($15K): multiple processes, complex integrations, larger stakeholder group",
    ],
    deliverables: [
      "Process audit and opportunity map",
      "Scoped system design",
      "Agreed success metric",
      "Go/no-go recommendation with supporting rationale",
      "Fixed-price Phase 3 proposal (if applicable)",
      "The plan is yours - no obligation to proceed with us",
    ],
  },
  {
    num: phaseLabel(build.phase),
    title: build.name,
    price: build.priceDisplay,
    meta: `${build.duration} · Requires ${phaseLabel(build.requiresPhase ?? 0)}`,
    body: "We build the system to the specification from the Discovery Sprint. Production-ready, integrated into your existing stack, with change management and team training included as standard. IP transfers to you on completion.",
    callout: "The Phase 3 price is fixed at the end of Phase 2. No surprises.",
    priceNote: [
      "Lower ($30K): single integration, defined scope, small team",
      "Upper ($120K): multiple integrations, complex data pipelines, larger team, extensive training",
    ],
    deliverables: [
      "Production AI system running in your stack",
      "Full IP transfer - code, documentation, model",
      "Team training and adoption plan (standard)",
      `${WARRANTY.windowDays}-day post-launch support window`,
      "Outcome measurement framework",
    ],
  },
  {
    num: phaseLabel(managed.phase),
    title: managed.name,
    price: managed.priceDisplay,
    meta: `${managed.duration} · Optional`,
    body: "Ongoing optimisation, performance monitoring, and strategic advisory. We stay close as the system processes real data and improves over time. Monthly reporting against the success metrics agreed in the Discovery Sprint. Direct access to Craig and Darryn. The monthly tiers are typically a 3-month minimum, month-to-month thereafter. Embedded days are booked as you need them.",
    // Derived from SUPPORT_TIERS so the tiers, the headline price on this page
    // and the JSON-LD cannot disagree.
    priceNote: SUPPORT_TIERS.map(
      (tier) =>
        `${tier.name} (${tier.priceDisplay}): ${tier.commitment}. ${tier.summary}`,
    ),
    // Was empty, which is why the ongoing phase read as a promise rather than
    // an offer. Derived from lib/support.ts so the commitments are stated once.
    deliverables: [
      ...RESPONSE_COMMITMENTS.map((c) => `${c.severity}: ${c.response.toLowerCase()}`),
      SUPPORT_HOURS,
      `${WARRANTY.defect.label}s fixed free inside the ${WARRANTY.windowDays}-day window; ${WARRANTY.change.label.toLowerCase()}s scoped and quoted`,
      MODEL_USAGE.billing,
      "Monthly reporting against the success metric agreed in the Discovery Sprint",
    ],
  },
];

// Small jobs, shown after the phases. Price comes from lib/pricing.ts.
export const hourly = {
  title: HOURLY_RATE.name,
  price: HOURLY_RATE.priceDisplay,
  meta: "Quoted up front · No phase required",
  body: "Not everything needs a phased engagement. For small, clearly defined work we quote by the hour, task by task, so you see the total before we start.",
  examples: [
    "Website changes and fixes",
    "A single automation or integration",
    "Claude or Copilot setup for your team",
    "Training sessions and workshops",
  ],
};

// SEO & AEO retainers, shown after the hourly band. Tier data comes from
// lib/pricing.ts; only the framing copy is written here.
export const seoAeo = {
  eyebrow: "Search & AI visibility",
  title: "SEO & AEO",
  intro:
    "Being found on Google is no longer enough. Customers now ask ChatGPT, Claude, Perplexity and Google's AI Overviews who to call, and those answers cite a handful of businesses. Every tier covers both: ranking in search, and being the business the AI answer names.",
  terms: `${SEO_AEO_MIN_TERM_MONTHS}-month minimum, then month to month. Billed monthly in advance. An optional site audit before month one is quoted at the hourly rate.`,
  tiers: SEO_AEO_TIERS,
};

export const reasons = [
  {
    num: "01",
    title: "It respects your time",
    body: "Professional services buyers make better decisions with real numbers. If our engagement costs are outside your budget, it's better for both of us to know before the first call.",
  },
  {
    num: "02",
    title: "It signals how we work",
    body: "Agencies that hide pricing often have flexible pricing - meaning the price depends on what they think you'll pay. We don't work that way. Our prices reflect the scope and complexity of the work.",
  },
  {
    num: "03",
    title: "It creates better conversations",
    body: "When you know what things cost, we can have a real conversation about what's worth doing. The first call becomes about the problem - not a quote request.",
  },
];
