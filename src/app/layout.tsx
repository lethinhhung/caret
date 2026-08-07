import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { BASE_URL, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "@/lib/site";
import "./globals.css";

/*
 * No webfont. The platform's own UI face already ships optical sizing, tracking
 * tables and legibility tuning that a downloaded face cannot match at 13px —
 * and it renders on the first paint, with no swap and no request. The stack
 * lives in `--font-app-sans` in globals.css.
 */

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  keywords: [
    "grammar checker",
    "spell checker",
    "punctuation checker",
    "proofreading",
    "writing assistant",
    "free grammar check",
  ],
  // The wordmark glyph, inline, so there is no icon request at all.
  // opengraph-image.tsx supplies the social card, and Next wires it into both
  // openGraph and twitter for us.
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%230C0D0F'/><path d='M9 19.5 16 12.5l7 7' fill='none' stroke='%23fff' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'/></svg>",
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: BASE_URL,
    siteName: SITE_NAME,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No maximumScale/userScalable — pinch zoom must stay available.
  // Matches --background in each theme, so the browser chrome blends into the page.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F5F7" },
    { media: "(prefers-color-scheme: dark)", color: "#090A0C" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/*
         * Applies the stored/system theme before first paint so the page never
         * flashes light while React hydrates. Inline by necessity — an external
         * script would run too late.
         */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <footer className="text-caption px-6 py-10 text-center text-muted-foreground">
          Made by{" "}
          <a
            href="https://thinghunggg.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm underline decoration-muted-foreground/40 underline-offset-4 transition-colors duration-press ease-spring-snappy outline-none hover:text-foreground hover:decoration-foreground/40 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            thinghunggg
          </a>
        </footer>
        {/*
         * Page views only — it never sees the text being checked. Inert outside
         * Vercel, so local dev and any self-host stay unaffected.
         */}
        <Analytics />
      </body>
    </html>
  );
}
