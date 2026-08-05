import type { Metadata, Viewport } from "next";
import { Lexend, Source_Sans_3, Geist_Mono } from "next/font/google";
import "./globals.css";

// Design system pairing: Lexend for headings, Source Sans 3 for body.
// `display: swap` avoids invisible text while the webfont loads.
const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Grammar Check — fast, focused proofreading",
  description:
    "Paste your text, add optional context, and get inline grammar, spelling, punctuation, and style corrections you can inspect and apply one at a time.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No maximumScale/userScalable — pinch zoom must stay available.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F0FDFA" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1F1E" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${lexend.variable} ${sourceSans.variable} ${geistMono.variable} h-full antialiased`}
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
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
