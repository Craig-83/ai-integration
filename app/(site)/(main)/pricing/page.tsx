import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { faqs, hourly, phases, reasons, seoAeo } from "./data";
import FAQ from "@/app/components/FAQ";
import { PricingSchema, BreadcrumbSchema } from "@/app/components/Schema";
import { HOURLY_RATE, pricingPhaseById, SEO_AEO_TIERS } from "@/lib/pricing";

// Prices in the description are derived so this string cannot drift from the
// page it describes, which is how it came to advertise a $5K/month Managed
// Partnership floor after that floor moved to $1K.
const priced = (id: Parameters<typeof pricingPhaseById>[0]) =>
  pricingPhaseById(id)
    .priceDisplay.replace("AUD ", "")
    // Lower-cased because these appear mid-sentence in the description.
    .replace(/^From /, "from ");

export const metadata: Metadata = {
  title: "AI Implementation Pricing Australia | Published Rates | Creative Milk",
  description: `Published AI implementation pricing: AI Tools Assessment ${priced(
    "assessment",
  )}, Discovery Sprint ${priced("discovery")}, Build & Integrate ${priced(
    "build",
  )}, Managed Partnership ${priced("managed")}, hourly work ${HOURLY_RATE.priceDisplay
    .replace("AUD ", "")
    .replace(/^From /, "from ")}, SEO & AEO from ${SEO_AEO_TIERS[0].priceDisplay.replace(
    "AUD ",
    "",
  )}. No hidden fees.`,
};

export default function Pricing() {
  return (
    <>
      <PricingSchema />
      <BreadcrumbSchema items={[
        { name: 'Home', url: '/' },
        { name: 'Pricing', url: '/pricing' },
      ]} />

        {/* ── Hero ── */}
        <section
          className="section"
          style={{
            backgroundColor: "var(--midnight-ink)",
            paddingTop: "clamp(6rem, 12vw, 9rem)",
          }}
        >
          <div className="container">
            <p className="eyebrow" style={{ marginBottom: "1.5rem" }}>Pricing</p>
            <h1
              className="h-display"
              style={{
                fontSize: "clamp(2.75rem, 7vw, 6rem)",
                color: "var(--warm-cream)",
                maxWidth: "18ch",
                marginBottom: "1.5rem",
              }}
            >
              Most AI agencies won't tell you what it costs.{" "}
              <em className="gold">We will.</em>
            </h1>
            <p
              className="body-copy"
              style={{
                maxWidth: "52ch",
                color: "rgba(245,240,232,0.6)",
                fontSize: "1.05rem",
                lineHeight: 1.7,
              }}
            >
              We publish our pricing because we think hiding it wastes everyone's time. If the
              numbers don't fit your budget, we'd rather you know now. If they do - let's talk
              about what we'd build.
            </p>
          </div>
        </section>

        {/* ── Phases ── */}
        <section
          className="section"
          style={{ backgroundColor: "var(--warm-cream)" }}
        >
          <div className="container">
            <p
              className="body-copy"
              style={{
                maxWidth: "56ch",
                marginBottom: "clamp(2.5rem, 4vw, 3.5rem)",
                color: "var(--slate-mid)",
              }}
            >
              Every Creative Milk engagement follows the same architecture. Each phase can stand
              alone, and you can start at whichever one fits the problem. Most clients begin with
              an assessment or a Discovery Sprint and proceed from there.
            </p>

            {phases.map((phase, idx) => (
              <div
                key={idx}
                style={{
                  borderTop: "1px solid var(--rule)",
                  marginBottom: 0,
                  overflow: "hidden",
                }}
              >
                {/* Phase header */}
                <div
                  style={{
                    backgroundColor: "var(--midnight-ink)",
                    padding: "clamp(1.25rem, 2vw, 1.75rem) clamp(1.5rem, 3vw, 2.5rem)",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <p className="eyebrow no-rule" style={{ marginBottom: "0.35rem" }}>
                      {phase.num}
                    </p>
                    <h2
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "clamp(1.4rem, 2.5vw, 2rem)",
                        fontWeight: 300,
                        color: "var(--warm-cream)",
                        lineHeight: 1.1,
                      }}
                    >
                      {phase.title}
                    </h2>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
                        fontWeight: 300,
                        color: "var(--liquid-gold)",
                        lineHeight: 1,
                        marginBottom: "0.3rem",
                      }}
                    >
                      {phase.price}
                    </p>
                    <p
                      className="label"
                      style={{ color: "rgba(245,240,232,0.45)" }}
                    >
                      {phase.meta}
                    </p>
                  </div>
                </div>

                {/* Phase body */}
                <div
                  style={{
                    backgroundColor: "white",
                    padding: "clamp(1.75rem, 3vw, 2.5rem) clamp(1.5rem, 3vw, 2.5rem)",
                    display: "grid",
                    gridTemplateColumns: phase.deliverables.length > 0 ? "1fr 1fr" : "1fr 1fr",
                    gap: "clamp(2rem, 4vw, 3.5rem)",
                  }}
                >
                  <div>
                    <p
                      className="body-copy"
                      style={{ color: "var(--slate-mid)", lineHeight: 1.75, marginBottom: "1.25rem" }}
                    >
                      {phase.body}
                    </p>
                    {phase.callout && (
                      <p
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: "0.82rem",
                          fontWeight: 700,
                          color: "var(--midnight-ink)",
                          marginBottom: "1rem",
                        }}
                      >
                        {phase.callout}
                      </p>
                    )}
                    <div
                      style={{
                        backgroundColor: "rgba(15,21,38,0.04)",
                        padding: "1rem 1.25rem",
                      }}
                    >
                      <p
                        className="label"
                        style={{ color: "var(--slate-mid)", marginBottom: "0.5rem" }}
                      >
                        {phase.noteLabel ?? "What affects the price"}
                      </p>
                      {phase.priceNote.map((note, ni) => (
                        <p
                          key={ni}
                          className="body-copy"
                          style={{
                            color: "var(--slate-mid)",
                            marginTop: ni > 0 ? "0.35rem" : 0,
                          }}
                        >
                          {note}
                        </p>
                      ))}
                    </div>
                  </div>
                  {phase.deliverables.length > 0 ? (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {phase.deliverables.map((item, di) => (
                        <li
                          key={di}
                          style={{
                            display: "flex",
                            gap: "0.75rem",
                            padding: "0.625rem 0",
                            borderBottom:
                              di < phase.deliverables.length - 1
                                ? "1px solid var(--rule)"
                                : "none",
                            alignItems: "flex-start",
                          }}
                        >
                          <span
                            style={{
                              flexShrink: 0,
                              width: "1rem",
                              height: "1rem",
                              marginTop: "0.15rem",
                              backgroundColor: "var(--liquid-gold)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.6rem",
                              color: "var(--midnight-ink)",
                              fontWeight: 700,
                            }}
                          >
                            ✓
                          </span>
                          <span
                            className="body-copy"
                            style={{ color: "var(--slate-mid)" }}
                          >
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div />
                  )}
                </div>
              </div>
            ))}
            <div style={{ borderTop: "1px solid var(--rule)" }} />

            {/* Small jobs by the hour. Sits outside the phase list on purpose:
                it is an offer, not a phase, so it must not read as Phase 05. */}
            <div
              style={{
                marginTop: "clamp(2.5rem, 4vw, 3.5rem)",
                border: "1px solid var(--rule)",
                backgroundColor: "white",
                padding: "clamp(1.75rem, 3vw, 2.5rem) clamp(1.5rem, 3vw, 2.5rem)",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "clamp(2rem, 4vw, 3.5rem)",
              }}
            >
              <div>
                <p className="eyebrow no-rule" style={{ marginBottom: "0.35rem" }}>
                  Small jobs
                </p>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(1.4rem, 2.5vw, 2rem)",
                    fontWeight: 300,
                    color: "var(--midnight-ink)",
                    lineHeight: 1.1,
                    marginBottom: "0.5rem",
                  }}
                >
                  {hourly.title}{" "}
                  <em className="gold">{hourly.price}</em>
                </h2>
                <p className="label" style={{ color: "var(--slate-mid)", marginBottom: "1.25rem" }}>
                  {hourly.meta}
                </p>
                <p className="body-copy" style={{ color: "var(--slate-mid)", lineHeight: 1.75 }}>
                  {hourly.body}
                </p>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {hourly.examples.map((item, i) => (
                  <li
                    key={i}
                    className="body-copy"
                    style={{
                      color: "var(--slate-mid)",
                      padding: "0.625rem 0",
                      borderBottom:
                        i < hourly.examples.length - 1 ? "1px solid var(--rule)" : "none",
                    }}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── SEO & AEO ── */}
        <section
          className="section"
          aria-labelledby="seo-aeo-heading"
          style={{ backgroundColor: "var(--warm-cream)", paddingTop: 0 }}
        >
          <div className="container">
            <div style={{ maxWidth: "60ch", marginBottom: "clamp(2rem, 3.5vw, 3rem)" }}>
              <p className="eyebrow" style={{ marginBottom: "1rem" }}>
                {seoAeo.eyebrow}
              </p>
              <h2
                id="seo-aeo-heading"
                className="h-section"
                style={{ color: "var(--midnight-ink)", marginBottom: "1rem" }}
              >
                {seoAeo.title}{" "}
                <em className="gold">from {SEO_AEO_TIERS[0].priceDisplay.replace("AUD ", "")}</em>
              </h2>
              <p className="body-copy" style={{ color: "var(--slate-mid)", lineHeight: 1.75 }}>
                {seoAeo.intro}
              </p>
            </div>

            {/* auto-fit so the three tiers stack on narrow screens without a
                media query, matching the inline-style convention of this page. */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
                gap: "1px",
                backgroundColor: "var(--rule)",
                border: "1px solid var(--rule)",
              }}
            >
              {seoAeo.tiers.map((tier) => (
                <div
                  key={tier.id}
                  style={{
                    backgroundColor: "white",
                    padding: "clamp(1.5rem, 2.5vw, 2rem)",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <p className="eyebrow no-rule" style={{ marginBottom: "0.5rem" }}>
                    {tier.hoursPerMonth} hours a month
                  </p>
                  <h3
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(1.3rem, 2.2vw, 1.75rem)",
                      fontWeight: 300,
                      color: "var(--midnight-ink)",
                      lineHeight: 1.1,
                      marginBottom: "0.35rem",
                    }}
                  >
                    {tier.name.replace("SEO & AEO ", "")}
                  </h3>
                  <p
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(1.4rem, 2.6vw, 2rem)",
                      fontWeight: 300,
                      color: "var(--liquid-gold)",
                      lineHeight: 1,
                      marginBottom: "0.75rem",
                    }}
                  >
                    {tier.priceDisplay}
                  </p>
                  <p className="label" style={{ color: "var(--slate-mid)", marginBottom: "1.25rem" }}>
                    {tier.bestFor}
                  </p>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {tier.includes.map((item, i) => (
                      <li
                        key={i}
                        className="body-copy"
                        style={{
                          color: "var(--slate-mid)",
                          padding: "0.5rem 0",
                          borderBottom:
                            i < tier.includes.length - 1 ? "1px solid var(--rule)" : "none",
                        }}
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <p
              className="body-copy"
              style={{ color: "var(--slate-mid)", marginTop: "1.25rem", fontSize: "0.9rem" }}
            >
              {seoAeo.terms}
            </p>
          </div>
        </section>

        {/* ── Why we publish ── */}
        <section
          className="section"
          style={{ backgroundColor: "var(--midnight-ink)" }}
        >
          <div className="container">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr",
                gap: "clamp(3rem, 6vw, 6rem)",
                alignItems: "end",
                marginBottom: "clamp(2.5rem, 4vw, 3.5rem)",
                paddingBottom: "clamp(2.5rem, 4vw, 3.5rem)",
                borderBottom: "1px solid var(--rule-cream)",
              }}
            >
              <h2
                className="h-section"
                style={{ color: "var(--warm-cream)" }}
              >
                Three reasons we put numbers on the page.
              </h2>
              <p
                className="body-copy"
                style={{ color: "rgba(245,240,232,0.55)" }}
              >
                It's not a bold move. It's just what professional services should look like.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
              {reasons.map((r, i) => (
                <div
                  key={i}
                  style={{
                    padding: "clamp(2rem, 3vw, 3rem)",
                    borderRight: i < reasons.length - 1
                      ? "1px solid var(--rule-cream)"
                      : "none",
                  }}
                >
                  <p
                    className="eyebrow no-rule"
                    style={{ marginBottom: "1rem" }}
                  >
                    {r.num}
                  </p>
                  <h3
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(1.2rem, 2vw, 1.5rem)",
                      fontWeight: 300,
                      color: "var(--warm-cream)",
                      marginBottom: "0.75rem",
                      lineHeight: 1.2,
                    }}
                  >
                    {r.title}
                  </h3>
                  <p
                    className="body-copy"
                    style={{ color: "rgba(245,240,232,0.55)" }}
                  >
                    {r.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQs ── */}
        <FAQ title="Pricing FAQs" items={faqs} />

        {/* ── CTA ── */}
        <section
          className="section"
          style={{ backgroundColor: "var(--midnight-ink)" }}
        >
          <div
            className="container"
            style={{ textAlign: "center", maxWidth: "52ch", marginInline: "auto" }}
          >
            <h2
              className="h-section"
              style={{ color: "var(--warm-cream)", marginBottom: "1.25rem" }}
            >
              Ready to see what we'd build for your budget?
            </h2>
            <p
              className="body-copy"
              style={{
                color: "rgba(245,240,232,0.6)",
                marginBottom: "2.5rem",
                fontSize: "1rem",
              }}
            >
              Tell us about your problem and your rough budget range. We'll tell you which phase
              makes sense to start with and what we'd expect to find in a Discovery Sprint.
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
                justifyContent: "center",
              }}
            >
              <a href="/contact" className="cta cta-gold">
                Book a call <ArrowRight size={16} />
              </a>
              <a href="/process" className="cta cta-outline-cream">
                See our process
              </a>
            </div>
          </div>
        </section>

    </>
  );
}
