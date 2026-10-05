"use client";

// Google "Preferred Sources" button. Lets a signed-in Google user add
// creative-milk.com.au as a preferred source, so our pages surface more often
// in their Top Stories and search results.
// Docs: https://developers.google.com/search/docs/appearance/preferred-sources
//
// Google's publisher.js (loaded once, lazily, in app/layout.tsx) finds every
// element carrying the google-add-preferred-source-btn attribute and renders
// the button into it. Without JavaScript, the <noscript> deeplink does the
// same job.
//
// publisher.js scans for buttons once, when it first runs. A button that
// mounts later (client-side navigation, or a footer React re-renders after
// that scan) stays empty, so each button asks the script to scan again on
// mount. Before the script has loaded, PREFERRED_SOURCE is a plain queue that
// publisher.js drains on startup; afterwards, push() runs the callback at once.

import { useEffect } from "react";

type PreferredSourceApi = { init: () => void };
type PreferredSourceQueue = {
  push: (...callbacks: ((api: PreferredSourceApi) => void)[]) => void;
};

declare global {
  interface Window {
    PREFERRED_SOURCE?: PreferredSourceQueue | ((api: PreferredSourceApi) => void)[];
  }
}

const DEEPLINK =
  "https://www.google.com/preferences/source?q=creative-milk.com.au";

export default function PreferredSource({
  theme,
  label,
  labelColor,
}: {
  theme: "light" | "dark";
  label: string;
  labelColor: string;
}) {
  useEffect(() => {
    window.PREFERRED_SOURCE = window.PREFERRED_SOURCE || [];
    window.PREFERRED_SOURCE.push((api) => api.init());
  }, []);

  return (
    <div style={{ display: "grid", gap: "0.6rem", justifyItems: "start" }}>
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "0.82rem",
          lineHeight: 1.7,
          color: labelColor,
          margin: 0,
        }}
      >
        {label}
      </p>
      <div google-add-preferred-source-btn="" data-theme={theme} data-lang="en" />
      <noscript>
        <a
          href={DEEPLINK}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "0.82rem",
            color: "var(--liquid-gold)",
            borderBottom: "1px solid rgba(201,168,76,0.3)",
            textDecoration: "none",
          }}
        >
          Add Creative Milk as a preferred source on Google
        </a>
      </noscript>
    </div>
  );
}
