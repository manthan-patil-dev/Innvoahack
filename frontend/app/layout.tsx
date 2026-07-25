import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

// Canela / Saol / Editorial New / Suisse Int'l / Neue Haas are all commercially
// licensed and cannot ship on a public deploy. Instrument Serif + Inter hold the
// same editorial register, are free, and are self-hosted by next/font.
const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const ui = Inter({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LifeOS AI — The AI Operating System For Your Entire Digital Life.",
  description:
    "LifeOS AI is a multi-agent operating system for digital life. One request, nine agents, one unified answer — orchestrated by the LifeCore engine.",
  openGraph: {
    title: "LifeOS AI",
    description: "The AI Operating System For Your Entire Digital Life.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${ui.variable}`}>
      <body>
        {/* Cream is the brand's default first impression — no system detection. */}
        <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
