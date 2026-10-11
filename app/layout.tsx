import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Righteous } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const righteous = Righteous({ variable: "--font-righteous", weight: "400", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });


const TITLE = "Hacktoberfest 2026 × SOSC";
const DESCRIPTION =
  "SOSC's Hacktoberfest 2026: open pull requests on SOSC and open-source projects all October, then log every one here before 31 October, 11:59 PM IST.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: `%s · ${TITLE}` },
  description: DESCRIPTION,
  applicationName: TITLE,
  keywords: ["Hacktoberfest", "Hacktoberfest 2026", "SOSC", "open source", "pull requests", "GitHub", "Mangalore"],
  authors: [{ name: "SOSC", url: "https://sosc.org.in" }],
  creator: "SOSC",
  publisher: "SOSC",
  category: "technology",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: TITLE,
    locale: "en_IN",
    title: TITLE,
    description: "Open PRs all October and log every one here. May the source be with you.",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: "Open PRs all October and log every one here. May the source be with you.",
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = { themeColor: "#ffffff" };


export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${righteous.variable} ${inter.variable} ${jetbrains.variable} antialiased`}
    >
      <body className="h-dvh overflow-hidden font-sans">
        {children}
      </body>
    </html>
  );
}
