import { SITE_URL } from "@/lib/site";
import { Experience } from "./components/Experience";

// Event structured data, so search results can show the dates
const EVENT = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: "Hacktoberfest 2026 × SOSC",
  description: "Open pull requests on SOSC and open-source projects all October and log every one before 31 October, 11:59 PM IST.",
  startDate: "2026-10-01T00:00:00+05:30",
  endDate: "2026-10-31T23:59:59+05:30",
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
  location: { "@type": "VirtualLocation", url: SITE_URL },
  image: [`${SITE_URL}/opengraph-image`],
  organizer: { "@type": "Organization", name: "SOSC", url: "https://sosc.org.in" },
  isAccessibleForFree: true,
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        // escape "<" so the JSON can never close the script tag
        dangerouslySetInnerHTML={{ __html: JSON.stringify(EVENT).replace(/</g, "\\u003c") }}
      />
      <Experience />
    </>
  );
}
