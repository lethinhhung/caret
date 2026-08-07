import { ImageResponse } from "next/og";
import { SITE_TAGLINE, SITE_TITLE } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = SITE_TITLE;

/*
 * The card sits on the page background exactly as it does in the app — same
 * two-tone elevation, same wordmark, same four category hues as the only
 * colour. Every element that has children needs an explicit display value —
 * satori has no block default.
 */
const PAGE = "#090A0C"; // --background, dark
const CARD = "#16171A"; // --card, dark
const INK = "#F7F8FA"; // --foreground, dark
const MUTED = "#9CA1A9"; // --muted-foreground, dark
const CATEGORY_COLORS = ["#FCA5A5", "#FCD34D", "#93C5FD", "#C4B5FD"];

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: PAGE,
          fontFamily: "sans-serif",
          padding: "64px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            padding: "72px",
            borderRadius: "40px",
            background: CARD,
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "22px",
              marginBottom: "32px",
            }}
          >
            <div
              style={{
                width: "84px",
                height: "84px",
                borderRadius: "21px",
                background: INK,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Same proportions as the in-app mark: the glyph fills about a
                  third of its tile. The favicon draws it larger because 16px
                  needs the extra weight. */}
              <svg width="48" height="48" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3.5 10.25 8 5.75l4.5 4.5"
                  stroke={CARD}
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div
              style={{
                fontSize: "72px",
                fontWeight: 700,
                color: INK,
                letterSpacing: "-2.5px",
              }}
            >
              Caret
            </div>
          </div>
          <div
            style={{
              fontSize: "34px",
              color: MUTED,
              maxWidth: "840px",
              lineHeight: 1.35,
              letterSpacing: "-0.5px",
            }}
          >
            {SITE_TAGLINE}
          </div>
          <div style={{ display: "flex", gap: "12px", marginTop: "auto" }}>
            {CATEGORY_COLORS.map((color) => (
              <div
                key={color}
                style={{
                  width: "56px",
                  height: "6px",
                  borderRadius: "3px",
                  background: color,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
