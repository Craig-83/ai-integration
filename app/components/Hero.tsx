"use client";

import { ArrowRight } from "lucide-react";
import WebGLBackground from "./WebGLBackground";
import { EVENTS, pushEvent } from "../lib/gtm";

const STATS = [
  { value: "50+", label: "Engagements" },
  { value: "95%", label: "Outcome rate" },
  { value: "$2M+", label: "Revenue lifted" },
  { value: "6–8", label: "Weeks to ship" },
];

export default function Hero() {
  return (
    <section
      id="top"
      style={{
        position: "relative",
        background: "var(--midnight-ink)",
        color: "var(--warm-cream)",
        minHeight: "100svh",
        display: "grid",
        gridTemplateRows: "1fr auto",
        overflow: "hidden",
        isolation: "isolate",
      }}
    >
      <WebGLBackground />

      <div
        className="container"
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingTop: "clamp(7rem, 14vh, 10rem)",
          paddingBottom: "clamp(2rem, 4vh, 3rem)",
          width: "100%",
        }}
      >
        <div
          className="eyebrow animate-slideDown"
          style={{ color: "var(--liquid-gold)", marginBottom: "2rem" }}
        >
          Melbourne{" "}
          <a href="/ai-automation-melbourne" style={{ textDecoration: "underline" }}>
            AI Automation
          </a>{" "}
          &amp; Implementation
        </div>

        <h1
          className="h-display animate-fadeInUp"
          style={{
            fontSize: "clamp(3.25rem, 9.5vw, 9rem)",
            color: "var(--warm-cream)",
            margin: 0,
            maxWidth: "16ch",
          }}
        >
          Intelligence
          <br />
          that <em className="gold">actually</em>
          <br />
          works.
        </h1>

        <p
          className="animate-fadeInUp delay-200"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "clamp(1rem, 1.4vw, 1.15rem)",
            lineHeight: 1.7,
            color: "rgba(245,240,232,0.62)",
            maxWidth: "52ch",
            marginTop: "2rem",
          }}
        >
          We build custom AI agents and workflow automations for growing
          Australian businesses. Every system connects to the tools your team
          already uses and is measured by outcomes, not deliverables.
        </p>

        <div
          className="animate-fadeInUp delay-400"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginTop: "2.5rem",
          }}
        >
          <a
            href="/contact"
            className="cta cta-gold"
            onClick={() =>
              pushEvent(EVENTS.CTA_CLICK, {
                cta_label: "book_a_call",
                cta_location: "hero",
              })
            }
          >
            Book a call <ArrowRight size={14} aria-hidden="true" />
          </a>
          <a
            href="#work"
            className="cta cta-outline-cream"
            onClick={() =>
              pushEvent(EVENTS.CTA_CLICK, {
                cta_label: "see_the_work",
                cta_location: "hero",
              })
            }
          >
            See the work
          </a>
        </div>
      </div>

      <div
        className="container"
        style={{
          position: "relative",
          zIndex: 1,
          paddingBottom: "clamp(1.5rem, 3vh, 2.5rem)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 0,
            borderTop: "1px solid var(--rule-cream)",
          }}
        >
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className="animate-fadeInUp"
              style={{
                animationDelay: `${0.5 + i * 0.08}s`,
                padding: "1.5rem 1.25rem 0",
                borderRight:
                  i < STATS.length - 1
                    ? "1px solid var(--rule-cream)"
                    : "none",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 300,
                  fontSize: "clamp(1.75rem, 3.5vw, 2.6rem)",
                  lineHeight: 1,
                  color: "var(--warm-cream)",
                  letterSpacing: "-0.01em",
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.6rem",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "rgba(245,240,232,0.42)",
                  marginTop: "0.6rem",
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
