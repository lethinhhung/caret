import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { BASE_URL, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "@/lib/site";
import "./globals.css";

// shadcn/ui's default pairing: Geist for everything, Geist Mono alongside it.
// `display: swap` avoids invisible text while the webfont loads.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

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
  // Inline SVG so there is no icon request at all. opengraph-image.tsx supplies
  // the social card, and Next wires it into both openGraph and twitter for us.
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✏️</text></svg>",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0A" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
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
        <footer className="py-6 text-center text-sm text-muted-foreground">
          Made by{" "}
          <a
            href="https://thinghunggg.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 transition-colors hover:text-foreground"
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
