import type { Metadata } from "next";
import { BreadcrumbSchema } from "@/app/components/Schema";

const title = "Specialised Website Design & Development | Creative Milk";
const description = "Creative Milk designs and develops specialised business websites, bringing strategy, design and development together around a clear business goal.";
const url = "https://www.creative-milk.com.au/specialised-websites";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  openGraph: { title, description, url, type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export default function SpecialisedWebsitesPage() {
  const service = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name: "Specialised website design and development",
    serviceType: "Website design and development",
    description,
    url,
    provider: { "@id": "https://www.creative-milk.com.au/#organisation" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(service) }} />
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Specialised websites", url: "/specialised-websites" }]} />
      <section className="section" style={{ background: "var(--midnight-ink)", color: "var(--warm-cream)", paddingTop: "clamp(8rem, 14vw, 11rem)" }}>
        <div className="container">
          <p className="eyebrow" style={{ marginBottom: "1.5rem" }}>Website strategy, design and development</p>
          <h1 className="h-display" style={{ fontSize: "clamp(2.75rem, 7vw, 6rem)", maxWidth: "18ch", marginBottom: "1.5rem" }}>
            Specialised websites. <em className="gold">Built for your business.</em>
          </h1>
          <p className="body-copy" style={{ color: "var(--warm-cream)", maxWidth: "62ch", marginBottom: "2rem" }}>
            Creative Milk designs and develops business websites around a clear goal.
            We bring strategy, design and development together to create fast,
            accessible sites that explain your offer and help visitors take the next step.
          </p>
          <a href="/contact" className="cta cta-gold">Discuss your website</a>
        </div>
      </section>

      <section className="section" style={{ background: "var(--warm-cream)", color: "var(--midnight-ink)" }}>
        <div className="container">
          <h2 className="h-section" style={{ marginBottom: "2rem" }}>What makes a website specialised?</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "2rem" }}>
            {[
              ["A clear business purpose", "Start with the audience, the offer and the action the website needs to support. An enquiry, a booking and a product purchase each need a different journey."],
              ["Content people can understand", "Structure pages around real customer questions. Clear service descriptions, useful examples and straightforward navigation help people assess whether your business fits their needs."],
              ["Design and development together", "Bring the visual design and the working experience into the same process, with attention to mobile use, accessibility and performance."],
            ].map(([heading, body]) => (
              <article key={heading}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", marginBottom: "1rem" }}>{heading}</h3>
                <p className="body-copy">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--off-white)", color: "var(--midnight-ink)" }}>
        <div className="container" style={{ maxWidth: "850px" }}>
          <h2 className="h-section" style={{ marginBottom: "1.5rem" }}>Website projects and AI automation</h2>
          <p className="body-copy" style={{ marginBottom: "1.5rem" }}>
            A website is often the first step in a business workflow. If enquiries lead to
            manual data entry, repeated emails or slow handovers, there may also be an
            automation opportunity. Creative Milk builds custom AI agents and workflow
            automations alongside its website services. Integration feasibility depends
            on your systems, permissions and the scope agreed before a build.
          </p>
          <a href="/ai-automation-melbourne" className="cta cta-outline-ink">Explore AI automation</a>
          <h2 className="h-section" style={{ marginTop: "3rem", marginBottom: "1.5rem" }}>See selected website work</h2>
          <p className="body-copy" style={{ marginBottom: "1.5rem" }}>
            Explore websites and digital products Darryn Lee-Warden helped bring to life.
            The portfolio describes his role in each project so you can assess the relevant experience.
          </p>
          <a href="https://websites.creative-milk.com.au" target="_blank" rel="noopener noreferrer" className="cta cta-outline-ink">View the website portfolio</a>
          <h2 className="h-section" style={{ marginTop: "3rem", marginBottom: "1.5rem" }}>What should you bring to the first conversation?</h2>
          <p className="body-copy" style={{ marginBottom: "1.5rem" }}>
            Share your current website if you have one, who you want to reach, the action
            you want visitors to take and any systems the site needs to connect to.
            Include your intended timing and budget so we can discuss a suitable scope.
            Website pricing and timing depend on the project requirements.
          </p>
          <a href="/contact" className="cta cta-gold">Talk to Creative Milk</a>
        </div>
      </section>
    </>
  );
}
