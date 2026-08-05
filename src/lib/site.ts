/**
 * Site identity, in one place. `metadataBase`, robots.ts, sitemap.ts and the OG
 * image all read from here so the production URL is a single-line change.
 */

export const BASE_URL = "https://caret-grammar.vercel.app";

export const SITE_NAME = "Caret";

export const SITE_TITLE = "Caret — Grammar, Spelling & Style Checker";

export const SITE_DESCRIPTION =
  "Paste your text and get inline grammar, spelling, punctuation, and style corrections you can inspect and apply one at a time. Free, no sign-up required.";

/** Short form, for the page header and the social card. */
export const SITE_TAGLINE =
  "Paste your text, inspect every fix, keep the ones you want.";
