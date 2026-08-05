import { ImageResponse } from "next/og";
import { SITE_TAGLINE, SITE_TITLE } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = SITE_TITLE;

// Neutral base to match the shadcn dark palette, with the four error-category
// hues as the only colour. Every element that has children needs an explicit
// display value — satori has no block default.
const CATEGORY_COLORS = ["#FCA5A5", "#FCD34D", "#93C5FD", "#C4B5FD"];

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0A0A0A 0%, #262626 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              background: "#FAFAFA",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "44px",
              lineHeight: 1,
              color: "#0A0A0A",
              fontWeight: 700,
              paddingTop: "14px",
            }}
          >
            ^
          </div>
          <div
            style={{
              fontSize: "64px",
              fontWeight: 700,
              color: "#FAFAFA",
              letterSpacing: "-1px",
            }}
          >
            Caret
          </div>
        </div>
        <div
          style={{
            fontSize: "28px",
            color: "#A1A1A1",
            maxWidth: "760px",
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          {SITE_TAGLINE}
        </div>
        <div style={{ display: "flex", gap: "12px", marginTop: "44px" }}>
          {CATEGORY_COLORS.map((color) => (
            <div
              key={color}
              style={{
                width: "44px",
                height: "6px",
                borderRadius: "3px",
                background: color,
              }}
            />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
