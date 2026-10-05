import type { Metadata } from "next";
import data from "./data.json";
import { withExternalLinkTargets } from "@/lib/external-links";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";

export const metadata: Metadata = {
  title: "Blog Article 08: How to Choose an AI Consultant in Australia — 7 Questions to Ask Before You Sign Anything | Creative Milk Insights",
  description: "The AI consulting market in Australia is crowded and uneven. Here are the seven questions that separate serious practitioners from agencies selling capability they can't deliver.",
};

export default function BlogPost() {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <Nav />
      <main id="main" style={{ paddingTop: "68px" }}>
        <style dangerouslySetInnerHTML={{ __html: data.css }} />
        <div dangerouslySetInnerHTML={{ __html: withExternalLinkTargets(data.html) }} />
      </main>
      <Footer />
    </>
  );
}