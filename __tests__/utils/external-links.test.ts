/**
 * Guards the outbound link policy: external links open in a new tab with
 * rel="noopener noreferrer"; internal links do not. Insight post bodies run
 * through withExternalLinkTargets, so future posts are covered too.
 */
import { isExternalHref, withExternalLinkTargets } from "@/lib/external-links";

describe("isExternalHref", () => {
  it("treats other domains, including our other owned sites, as external", () => {
    expect(isExternalHref("https://websites.creative-milk.com.au")).toBe(true);
    expect(isExternalHref("https://support.google.com/business")).toBe(true);
    expect(isExternalHref("//cdn.example.com/x")).toBe(true);
  });

  it("treats same-site links as internal", () => {
    for (const href of ["/contact", "#work", "tel:0400000000", "mailto:hi@example.com", "https://creative-milk.com.au/pricing", "https://www.creative-milk.com.au/"]) {
      expect(isExternalHref(href)).toBe(false);
    }
  });
});

describe("withExternalLinkTargets", () => {
  it("adds target and rel to external anchors", () => {
    expect(withExternalLinkTargets('<p><a href="https://example.com/a" class="x">A</a></p>')).toBe(
      '<p><a href="https://example.com/a" class="x" target="_blank" rel="noopener noreferrer">A</a></p>',
    );
  });

  it("replaces an incomplete existing target/rel", () => {
    expect(withExternalLinkTargets('<a rel="noopener" href="https://example.com">A</a>')).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">A</a>',
    );
  });

  it("leaves internal anchors untouched", () => {
    const html = '<a href="/contact">C</a><a href="#faq">F</a><a href="https://www.creative-milk.com.au/pricing">P</a>';
    expect(withExternalLinkTargets(html)).toBe(html);
  });
});
