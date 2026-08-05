import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
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
  title: "Caret — fast, focused proofreading",
  description:
    "Paste your text, add optional context, and get inline grammar, spelling, punctuation, and style corrections you can inspect and apply one at a time.",
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
        {/*
         * Page views only — it never sees the text being checked. Inert outside
         * Vercel, so local dev and any self-host stay unaffected.
         */}
        <Analytics />
      </body>
    </html>
  );
}
