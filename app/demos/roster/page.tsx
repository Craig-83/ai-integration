import type { Metadata } from "next";
import RosterApp from "./RosterApp";

export const metadata: Metadata = {
  title: "Roster Guard demo | Creative Milk",
  description: "A live rostering demo: award costs, visa limits, tenant security and contract budget checked on every shift.",
  robots: { index: false, follow: false },
};

export default function RosterDemoPage() {
  return <RosterApp />;
}
