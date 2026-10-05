import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import type { CSSProperties } from "react";

type Project = {
  name: string;
  url: string;
  host: string;
  summary: string;
  contribution: string;
  disciplines: string[];
  screenshot: string;
  screenshotHeight: number;
  palette: [string, string, string];
  motif: string;
};

const PROJECTS: Project[] = [
  {
    name: "Bureau of Meteorology",
    url: "https://www.bom.gov.au/",
    host: "bom.gov.au",
    summary: "An authoritative national weather experience shaped around clarity, environmental data, and public access.",
    contribution: "Add my exact role and contribution",
    disciplines: ["UX Design", "UI Design", "Development", "Design System"],
    screenshot: "/images/websites/bom.webp",
    screenshotHeight: 2219,
    palette: ["#76b9df", "#102d4f", "#d9f2ff"],
    motif: "atmosphere",
  },
  {
    name: "AGL",
    url: "https://www.agl.com.au/",
    host: "agl.com.au",
    summary: "A focused energy experience connecting complex services with clear pathways for Australian households.",
    contribution: "Add my exact role and contribution",
    disciplines: ["UX Design", "UI Design", "Development"],
    screenshot: "/images/websites/agl.webp",
    screenshotHeight: 7130,
    palette: ["#ffd500", "#202124", "#fff7ba"],
    motif: "energy",
  },
  {
    name: "Australian Unity",
    url: "https://www.australianunity.com.au/",
    host: "australianunity.com.au",
    summary: "A warm, human digital experience spanning health, wealth, and everyday wellbeing.",
    contribution: "Add my exact role and contribution",
    disciplines: ["UX Design", "UI Design", "Design System"],
    screenshot: "/images/websites/australian-unity.webp",
    screenshotHeight: 5144,
    palette: ["#d97b52", "#382921", "#f5dfce"],
    motif: "wellbeing",
  },
  {
    name: "Samsonite Australia",
    url: "https://www.samsonite.com.au/",
    host: "samsonite.com.au",
    summary: "A premium commerce journey designed to keep product, utility, and travel confidence in motion.",
    contribution: "Add my exact role and contribution",
    disciplines: ["UX Design", "UI Design", "Ecommerce"],
    screenshot: "/images/websites/samsonite.webp",
    screenshotHeight: 5301,
    palette: ["#b4a48e", "#17191d", "#e9e2d8"],
    motif: "routes",
  },
  {
    name: "Myer",
    url: "https://www.myer.com.au/",
    host: "myer.com.au",
    summary: "An editorial retail platform balancing campaign storytelling with a direct path to product.",
    contribution: "Add my exact role and contribution",
    disciplines: ["UX Design", "UI Design", "Ecommerce"],
    screenshot: "/images/websites/myer.webp",
    screenshotHeight: 6453,
    palette: ["#d71920", "#181818", "#f5ede7"],
    motif: "editorial",
  },
  {
    name: "TaylorMade Golf Australia",
    url: "https://www.taylormadegolf.com.au/",
    host: "taylormadegolf.com.au",
    summary: "A precise performance-commerce experience where engineered products lead the visual story.",
    contribution: "Add my exact role and contribution",
    disciplines: ["UX Design", "UI Design", "Development", "Ecommerce"],
    screenshot: "/images/websites/taylormade.webp",
    screenshotHeight: 4451,
    palette: ["#ef312f", "#16191c", "#d9dde0"],
    motif: "trajectory",
  },
  {
    name: "HESTA",
    url: "https://www.hesta.com.au/",
    host: "hesta.com.au",
    summary: "A confident, human-centred member experience built around progress and long-term financial wellbeing.",
    contribution: "Add my exact role and contribution",
    disciplines: ["UX Design", "UI Design", "Design System"],
    screenshot: "/images/websites/hesta.webp",
    screenshotHeight: 5392,
    palette: ["#eb5b48", "#3c2430", "#ffd2bd"],
    motif: "progress",
  },
  {
    name: "AIA Australia",
    url: "https://www.aia.com.au/",
    host: "aia.com.au",
    summary: "An optimistic digital ecosystem connecting protection, vitality, and healthier living.",
    contribution: "Add my exact role and contribution",
    disciplines: ["UX Design", "UI Design", "Development"],
    screenshot: "/images/websites/aia.webp",
    screenshotHeight: 5195,
    palette: ["#d31145", "#361522", "#ffdce4"],
    motif: "vitality",
  },
  {
    name: "Falls Creek Alpine Resort",
    url: "https://www.fallscreek.com.au/",
    host: "fallscreek.com.au",
    summary: "An atmospheric alpine destination experience shaped by elevation, season, and a strong sense of place.",
    contribution: "Add my exact role and contribution",
    disciplines: ["UX Design", "UI Design", "Development"],
    screenshot: "/images/websites/falls-creek.webp",
    screenshotHeight: 4190,
    palette: ["#7eb4d1", "#142a3a", "#e9f5f8"],
    motif: "alpine",
  },
];

export default function WebsiteShowcase() {
  return (
    <main id="websites-main" className="ws-portfolio">
      <header className="ws-intro">
        <div className="ws-intro-copy">
          <p>Selected Work</p>
          <h1 className="ws-intro-focus" aria-label="Websites assembled with intent.">
            <span className="ws-type-line ws-type-line-1" aria-hidden="true">Websites</span>
            <span className="ws-type-line ws-type-line-2" aria-hidden="true">assembled</span>
            <span className="ws-type-line ws-type-line-3" aria-hidden="true">with intent.</span>
          </h1>
          <div className="ws-intro-foot">
            <span aria-hidden="true">Scroll to explore</span>
          </div>
        </div>
      </header>

      <nav className="ws-progress" aria-label="Project progress">
        {PROJECTS.map((project, index) => (
          <a key={project.name} href={`#project-${index + 1}`} aria-label={`Go to project ${index + 1}: ${project.name}`}>
            <span>{String(index + 1).padStart(2, "0")}</span>
          </a>
        ))}
      </nav>

      <section className="ws-sequence" aria-label="Selected website projects">
        {PROJECTS.map((project, index) => (
          <ProjectChapter key={project.name} project={project} index={index} total={PROJECTS.length} />
        ))}
      </section>

      <footer className="ws-outro">
        <p>End of selection</p>
        <h2>Have a digital product that needs clarity?</h2>
        <a href="https://www.creative-milk.com.au/contact" target="_blank" rel="noopener noreferrer">Start a conversation <ArrowUpRight size={18} /></a>
      </footer>
    </main>
  );
}

function ProjectChapter({ project, index, total }: { project: Project; index: number; total: number }) {
  const number = String(index + 1).padStart(2, "0");
  const style = {
    "--ws-accent": project.palette[0],
    "--ws-ink": project.palette[1],
    "--ws-light": project.palette[2],
  } as CSSProperties;

  return (
    <article id={`project-${index + 1}`} className={`ws-chapter ws-motif-${project.motif}`} style={style}>
      <div className="ws-stage">
        <div className="ws-ghost-number" aria-hidden="true">{number}</div>
        <div className="ws-atmosphere" aria-hidden="true"><i /><i /><i /></div>

        <div className="ws-frame-wrap">
          <a className="ws-browser" href={project.url} target="_blank" rel="noopener noreferrer" aria-label={`Visit the ${project.name} website`}>
            <span className="ws-frame-edge ws-frame-top"><i /><i /><i /><b>{project.host}</b></span>
            <span className="ws-frame-edge ws-frame-left" />
            <span className="ws-frame-edge ws-frame-right" />
            <span className="ws-frame-edge ws-frame-bottom" />
            <span className="ws-screen">
              {project.motif === "wellbeing" ? (
                <span className="ws-au-composition">
                  <Image
                    className="ws-au-hero"
                    src="/images/websites/australian-unity-hero.webp"
                    width={1907}
                    height={773}
                    sizes="(max-width: 900px) 90vw, 62vw"
                    alt="Australian Unity wellbeing campaign featuring a customer outdoors"
                  />
                  <Image
                    className="ws-au-header"
                    src="/images/websites/australian-unity-header.webp"
                    width={1909}
                    height={175}
                    sizes="(max-width: 900px) 90vw, 62vw"
                    alt="Australian Unity website header and service navigation"
                  />
                  <Image
                    className="ws-au-offer"
                    src="/images/websites/australian-unity-offer.webp"
                    width={519}
                    height={414}
                    sizes="(max-width: 900px) 35vw, 24vw"
                    alt="Australian Unity health insurance offer panel"
                  />
                </span>
              ) : (
                <Image
                  className="ws-live-page"
                  src={project.screenshot}
                  width={1200}
                  height={project.screenshotHeight}
                  sizes="(max-width: 900px) 90vw, 62vw"
                  priority={index === 0}
                  alt={`${project.name} website homepage showing its navigation, hero, imagery, and page content`}
                />
              )}
              <span className="ws-screen-shade" aria-hidden="true" />
            </span>
          </a>
        </div>

        <div className="ws-details">
          <div className="ws-count">{number} / {String(total).padStart(2, "0")}</div>
          <h2>{project.name}</h2>
          <p className="ws-summary">{project.summary}</p>
          <div className="ws-meta">
            <div><span>Contribution</span><p>{project.contribution}</p></div>
            <div><span>Disciplines</span><ul>{project.disciplines.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </div>
          <a className="ws-visit" href={project.url} target="_blank" rel="noopener noreferrer">
            Visit website <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}
