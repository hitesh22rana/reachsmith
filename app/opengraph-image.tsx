import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          padding: 80,
          background: "#ffffff",
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 700 }}>ReachSmith</div>
        <div style={{ fontSize: 32, color: "#666666" }}>
          Referral outreach without the spreadsheet.
        </div>
      </div>
    ),
    size,
  );
}
