// components/Schema.tsx
// Reusable schema component — import and use in layout.tsx and individual pages
//
// USAGE:
//   In app/layout.tsx  → <OrganisationSchema /> + <WebsiteSchema />
//   In page files      → <ServiceSchema />, <FAQSchema />, <BreadcrumbSchema /> etc.

import React from 'react'

import { HOURLY_RATE, PRICING_PHASES, SEO_AEO_TIERS, type PriceShape } from '@/lib/pricing'

const BASE_URL = 'https://www.creative-milk.com.au'

// ── 1. ORGANISATION (place in root layout.tsx) ────────────────────────────────
// Tells Google who Creative Milk is as an entity.
export function OrganisationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${BASE_URL}/#organisation`,
    name: 'Creative Milk',
    url: BASE_URL,
    logo: `${BASE_URL}/icon.png`,
    description:
      'Creative Milk builds custom AI agents, workflow automations and specialised business websites for Australian businesses.',
    // Must stay identical to the Google Business Profile listing. Search
    // engines treat a name/address/phone mismatch between a site and its GBP
    // as a signal that the two are different entities, which matters here
    // because page one for "Creative Milk" is shared with several unrelated
    // design agencies.
    address: {
      '@type': 'PostalAddress',
      streetAddress: '13 Mason Ave',
      addressLocality: 'Elwood',
      addressRegion: 'VIC',
      postalCode: '3184',
      addressCountry: 'AU',
    },
    areaServed: {
      '@type': 'Country',
      name: 'Australia',
    },
    sameAs: [
      'https://www.facebook.com/Creative.MilkAI',
      'https://www.instagram.com/creativemilk.ai/',
    ],
    knowsAbout: [
      'Artificial Intelligence',
      'AI Implementation',
      'Business Automation',
      'AI Agents',
      'Agentic Workflows',
      'Workflow Automation',
      'Small Business Automation',
      'AI Consulting Melbourne',
      'Custom AI Systems',
      'Website Design and Development',
      'Machine Learning',
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// ── 2. WEBSITE (place in root layout.tsx) ────────────────────────────────────
// Establishes the website name and its relationship to the organisation.
export function WebsiteSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BASE_URL}/#website`,
    url: BASE_URL,
    name: 'Creative Milk',
    description: 'Custom AI agents, workflow automation and specialised business websites.',
    publisher: {
      '@id': `${BASE_URL}/#organisation`,
    },
    inLanguage: 'en-AU',
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// ── 3. SERVICE PAGE (use in /what-we-build/page.tsx) ─────────────────────────
export function ServiceSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'AI Implementation Services',
    provider: {
      '@id': `${BASE_URL}/#organisation`,
    },
    serviceType: 'AI Consulting and Implementation',
    areaServed: {
      '@type': 'Country',
      name: 'Australia',
    },
    description:
      'Practical AI applications for Australian businesses including customer support automation, sales intelligence, operations automation, and document processing.',
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'AI Implementation Services',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Discovery Sprint',
            description: 'AI readiness assessment and scoped problem definition.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Build & Integrate',
            description: 'Custom AI system design, development, and integration.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Managed AI Partnership',
            description: 'Ongoing AI operations, monitoring, and optimisation.',
          },
        },
      ],
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// ── 4. PRICING PAGE (use in /pricing/page.tsx) ────────────────────────────────
// Offers derive from lib/pricing.ts so the structured data cannot drift from
// the published pricing page. Ranged tiers use minPrice/maxPrice: emitting a
// flat `price` for a range tells Google the lower bound is the actual price.
function priceSpecificationFor(price: PriceShape) {
  switch (price.kind) {
    case 'fixed':
      return {
        '@type': 'PriceSpecification',
        price: String(price.amount),
        priceCurrency: 'AUD',
      }
    case 'range':
      return {
        '@type': 'PriceSpecification',
        minPrice: String(price.min),
        maxPrice: String(price.max),
        priceCurrency: 'AUD',
      }
    case 'monthlyRange':
      return {
        '@type': 'UnitPriceSpecification',
        minPrice: String(price.min),
        maxPrice: String(price.max),
        priceCurrency: 'AUD',
        unitCode: 'MON',
      }
    // A floor with no ceiling. minPrice without maxPrice is valid and is the
    // honest representation: inventing a maximum would misstate the offer.
    case 'monthlyFrom':
      return {
        '@type': 'UnitPriceSpecification',
        minPrice: String(price.min),
        priceCurrency: 'AUD',
        unitCode: 'MON',
      }
    case 'daily':
      return {
        '@type': 'UnitPriceSpecification',
        price: String(price.amount),
        priceCurrency: 'AUD',
        unitCode: 'DAY',
      }
    // UN/CEFACT code HUR = hour. A floor, so minPrice only (see monthlyFrom).
    case 'hourlyFrom':
      return {
        '@type': 'UnitPriceSpecification',
        minPrice: String(price.min),
        priceCurrency: 'AUD',
        unitCode: 'HUR',
      }
  }
}

export function PricingSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Creative Milk AI Implementation Pricing',
    description: 'Transparent AI implementation pricing for Australian businesses.',
    // The hourly rate and SEO/AEO tiers are listed after the phases; they are
    // offers on the page but not phases, so they are appended rather than
    // added to PRICING_PHASES.
    itemListElement: [...PRICING_PHASES, HOURLY_RATE, ...SEO_AEO_TIERS].map((phase, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Offer',
        name: phase.name,
        description: phase.schemaDescription,
        priceSpecification: priceSpecificationFor(phase.price),
        seller: { '@id': `${BASE_URL}/#organisation` },
      },
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// ── 5. BREADCRUMB (use on any inner page) ─────────────────────────────────────
// Example: <BreadcrumbSchema items={[{ name: 'Home', url: '/' }, { name: 'Pricing', url: '/pricing' }]} />
interface BreadcrumbItem {
  name: string
  url: string
}

export function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// ── BLOG POSTING (used by app/(site)/(dark-nav)/insights/[slug]/page.tsx) ───
// Dates + publisher entity are what AI search engines (ChatGPT, Perplexity,
// Google AI Overviews) use to judge freshness and citability.
interface BlogPostingSchemaProps {
  title: string
  description: string
  slug: string
  datePublished: string
  dateModified: string
  category?: string
}

export function BlogPostingSchema({
  title,
  description,
  slug,
  datePublished,
  dateModified,
  category,
}: BlogPostingSchemaProps) {
  const url = `${BASE_URL}/insights/${slug}`
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: title,
    description,
    url,
    image: [`${BASE_URL}/opengraph-image`],
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: {
      '@type': 'Organization',
      '@id': `${BASE_URL}/#organisation`,
      name: 'Creative Milk',
      url: BASE_URL,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${BASE_URL}/#organisation`,
      name: 'Creative Milk',
      logo: `${BASE_URL}/icon.png`,
    },
    datePublished,
    dateModified,
    ...(category && { articleSection: category }),
    inLanguage: 'en-AU',
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// ── 6. CASE STUDY / ARTICLE (use on /work/[slug]/page.tsx) ──────────────────
interface CaseStudySchemaProps {
  title: string
  description: string
  url: string
  datePublished?: string
  industry?: string
}

export function CaseStudySchema({
  title,
  description,
  url,
  datePublished,
  industry,
}: CaseStudySchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url: `${BASE_URL}${url}`,
    image: [`${BASE_URL}/opengraph-image`],
    author: {
      '@type': 'Organization',
      '@id': `${BASE_URL}/#organisation`,
      name: 'Creative Milk',
      url: BASE_URL,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${BASE_URL}/#organisation`,
      name: 'Creative Milk',
      logo: `${BASE_URL}/icon.png`,
    },
    ...(datePublished && { datePublished }),
    ...(industry && { about: { '@type': 'Thing', name: industry } }),
    inLanguage: 'en-AU',
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// ── 7. LOCAL SERVICE (use on geo-targeted landing pages, e.g. /ai-consulting-melbourne) ──
// Distinct from ServiceSchema (site-wide, areaServed: Australia) — this pins
// areaServed to a specific city so the page can carry its own service-area
// signal without overriding the generic Service entity used elsewhere.
interface LocalServiceSchemaProps {
  serviceName: string
  areaName: string
  description: string
  url: string
}

export function LocalServiceSchema({
  serviceName,
  areaName,
  description,
  url,
}: LocalServiceSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: serviceName,
    provider: { '@id': `${BASE_URL}/#organisation` },
    areaServed: {
      '@type': 'City',
      name: areaName,
    },
    description,
    url: `${BASE_URL}${url}`,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// ── 7. WORKSHOP EVENT (use in /events/workshop-melbourne/layout.tsx) ──────────
// Ticketed, dated, capacity-limited event - Event schema is what feeds Google's
// Event rich results and AI-answer engines for queries like "AI workshop Melbourne".
// Added 2026-08-01 (seo-audit-agent monthly run) - the page had no Event schema.
// Price/date/seats must be kept in sync BY HAND with the live page copy (source of
// truth is the page itself, not this file) - flagged separately in the audit brief
// because the live page copy itself was showing a stale/expired early-bird price
// at the time of this run.
export function EventSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: 'Automate Your Business: AI Automation Workshop',
    description:
      'A two-hour, in-person AI workshop in Melbourne: learn the fundamentals in plain English and build a working automated email-reply system for your business.',
    startDate: '2026-08-07T15:00:00+10:00',
    endDate: '2026-08-07T17:00:00+10:00',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: 'Elwood + St Kilda Neighbourhood Learning Centre',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Elwood',
        addressRegion: 'VIC',
        addressCountry: 'AU',
      },
    },
    organizer: { '@id': `${BASE_URL}/#organisation` },
    performer: { '@id': `${BASE_URL}/#organisation` },
    offers: {
      '@type': 'Offer',
      price: '35',
      priceCurrency: 'AUD',
      availability: 'https://schema.org/InStock',
      url: `${BASE_URL}/events/workshop-melbourne`,
      validFrom: '2026-06-01T00:00:00+10:00',
    },
    maximumAttendeeCapacity: 24,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
