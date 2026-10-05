/**
 * Outbound link policy: every link to a different domain opens in a new tab
 * with rel="noopener noreferrer", so visitors are never sent away from the
 * site. Same-site links (relative paths, anchors, tel:, mailto:, and absolute
 * URLs on creative-milk.com.au itself) stay in the same tab. Other owned sites,
 * such as websites.creative-milk.com.au, count as external.
 */

const OWN_HOSTS = ["creative-milk.com.au"];

export const EXTERNAL_LINK_REL = "noopener noreferrer";

/** True when href is an absolute http(s) or protocol-relative URL on another host. */
export function isExternalHref(href: string, ownHosts: string[] = OWN_HOSTS): boolean {
  const h = href.trim();
  if (!/^(https?:)?\/\//i.test(h)) return false;
  let host: string;
  try {
    host = new URL(h, "https://placeholder.invalid").hostname.toLowerCase();
  } catch {
    return false;
  }
  return !ownHosts.includes(host.replace(/^www\./, ""));
}

/**
 * Adds target="_blank" and rel="noopener noreferrer" to every external <a> in
 * a pre-rendered HTML string (Insight posts, member content), replacing any
 * existing target/rel on those anchors. Internal anchors are left untouched.
 */
export function withExternalLinkTargets(html: string, ownHosts: string[] = OWN_HOSTS): string {
  return html.replace(/<a\b([^>]*)>/gi, (tag, attrs: string) => {
    const m = attrs.match(/\shref\s*=\s*(["'])(.*?)\1/i);
    if (!m || !isExternalHref(m[2], ownHosts)) return tag;
    const rest = attrs.replace(/\s(target|rel)\s*=\s*(["']).*?\2/gi, "");
    return `<a${rest} target="_blank" rel="${EXTERNAL_LINK_REL}">`;
  });
}
