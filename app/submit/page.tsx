import type { Metadata } from "next";
import { SubmitView } from "./SubmitView";

export const metadata: Metadata = {
  title: "Submit your PRs",
  description: "Sign in with your college Google account to log and manage your Hacktoberfest 2026 pull requests.",
  alternates: { canonical: "/submit" },
  // a signed-in form: nothing for search engines here
  robots: { index: false, follow: true },
};

export default function SubmitPage() {
  return <SubmitView />;
}
