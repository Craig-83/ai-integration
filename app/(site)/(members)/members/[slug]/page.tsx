import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { withExternalLinkTargets } from "@/lib/external-links";
import { itemBySlug } from "@/lib/members/items";
import { canAccess } from "@/lib/members/access";
import { getMemberProfile } from "@/lib/supabase/auth-server";
import LockedPreview from "@/app/components/members/LockedPreview";
import PromptCopyEnhancer from "@/app/components/members/PromptCopyEnhancer";
import { TOOL_COMPONENTS } from "@/app/components/members/tools";
import "./members-article.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = itemBySlug(slug);
  return {
    title: item ? `${item.title} | Creative Milk Members` : "Members",
    robots: { index: false, follow: false },
  };
}

export default async function MemberItemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = itemBySlug(slug);
  if (!item) notFound();

  const member = await getMemberProfile();
  const tier = member?.profile.tier ?? null;
  const allowed = canAccess(item.tier, tier);

  return (
    <article className="section">
      <div className="container">
        <div style={{ maxWidth: 720, marginInline: "auto" }}>
          <p className="eyebrow" style={{ marginBottom: "1.5rem" }}>
            <Link href="/members/library">← Library</Link>
          </p>
          <h1
            className="h-display"
            style={{
              fontSize: "clamp(2.5rem, 5vw, 3.75rem)",
              marginBottom: "1rem",
            }}
          >
            {item.title}
          </h1>
          <p
            style={{
              color: "var(--slate-mid)",
              fontSize: "1.125rem",
              lineHeight: 1.6,
              marginBottom: "2.5rem",
            }}
          >
            {item.description}
          </p>

      {!allowed ? (
        <LockedPreview title={item.title} />
      ) : item.type === "download" ? (
        <div>
          <a
            href={`/api/members/download/${item.slug}`}
            className="cta"
            style={{ minHeight: 44, display: "inline-block" }}
          >
            Download {item.fileName}
          </a>
          {item.previewPath && (
            <iframe
              src={item.previewPath}
              title={`${item.title} preview`}
              className="members-download-preview"
            />
          )}
        </div>
      ) : item.type === "tool" ? (
        (() => {
          const Tool = TOOL_COMPONENTS[item.componentKey];
          return <Tool />;
        })()
      ) : (
        <>
          <div
            id={`members-guide-${item.slug}`}
            className="members-article"
            dangerouslySetInnerHTML={{ __html: withExternalLinkTargets(item.html) }}
          />
          <PromptCopyEnhancer rootId={`members-guide-${item.slug}`} />
        </>
      )}
        </div>
      </div>
    </article>
  );
}
