import type { Metadata } from "next";
import data from "./data.json";
import { withExternalLinkTargets } from "@/lib/external-links";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";

export const metadata: Metadata = {
  title: "Blog Article 07: AI for Construction and Trades — Where the Biggest Time Savings Actually Are | Creative Milk Insights",
  description: "The construction and trades sector has one of the highest AI ROI potentials of any Australian industry — and almost no specialist serving it. Here's where the real time savings are.",
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