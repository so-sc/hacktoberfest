"use client";

import { useRouter } from "next/navigation";
import { SubmissionPanel } from "../components/SubmissionPanel";

/** /submit opened directly (or refreshed): the form, no landing animation. */
export function SubmitView() {
  const router = useRouter();
  return (
    <div className="relative h-dvh">
      <SubmissionPanel active standalone onBack={() => router.push("/")} />
    </div>
  );
}
