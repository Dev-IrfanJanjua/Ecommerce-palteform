/**
 * FONTS — the only place font families are chosen.
 *
 * `next/font/google` downloads these at BUILD time and self-hosts them, so
 * there is no request to Google when a visitor loads the page, and no layout
 * shift while a webfont swaps in.
 *
 * To change the look of the whole site, change the two imports below and the
 * two font functions. Nothing else needs editing — components only ever use
 * the `font-heading` and `font-body` Tailwind utilities, which read the CSS
 * variables declared here.
 */
import { Inter, Space_Grotesk } from "next/font/google";

/** Headings: Space Grotesk — modern, slightly technical, sporty. */
export const headingFont = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading-family",
});

/** Body copy: Inter — designed for UI, highly legible at small sizes. */
export const bodyFont = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body-family",
});

/** Both font variables, ready to drop onto the <html> element. */
export const fontVariables = `${headingFont.variable} ${bodyFont.variable}`;
