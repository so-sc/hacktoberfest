import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Righteous } from "next/font/google";
import "./globals.css";

const righteous = Righteous({ variable: "--font-righteous", weight: "400", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hacktoberfest 2026 × SOSC",
  description:
    "SOSC's Hacktoberfest 2026. Open pull requests all October and log every one here before 31 Oct.",
  openGraph: {
    title: "Hacktoberfest 2026 × SOSC",
    description: "Open PRs all October. Log them here. May the source be with you.",
  },
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
