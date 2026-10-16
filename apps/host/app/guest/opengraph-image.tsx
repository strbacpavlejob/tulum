import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "Tulum — discover events, meet people, and go out together.";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        position: "relative",
        display: "flex",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background:
          "linear-gradient(135deg, #080611 0%, #151022 55%, #0a0812 100%)",
        color: "#ffffff",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -190,
          right: -125,
          width: 620,
          height: 620,
          borderRadius: "50%",
          background:
            "linear-gradient(135deg, rgba(124, 58, 237, 0.42), rgba(236, 72, 153, 0.18))",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -380,
          left: 360,
          width: 720,
          height: 720,
          borderRadius: "50%",
          background:
            "linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(124, 58, 237, 0.24))",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "64px 72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 18,
              background: "linear-gradient(135deg, #7c3aed, #ec4899)",
              fontSize: 32,
              fontWeight: 800,
            }}
          >
            T
          </div>
          <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: 3 }}>
            TULUM
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxWidth: 940,
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.05,
            }}
          >
            <span>Real Events. Real People.</span>
            <span>Real Moments.</span>
          </div>
          <div
            style={{
              maxWidth: 920,
              color: "#d6d2e1",
              fontSize: 26,
              lineHeight: 1.35,
            }}
          >
            Discover events, see who’s going, and meet people already there.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#c6c0d8",
            fontSize: 20,
          }}
        >
          <span>Discover. Match. Go out.</span>
          <span>tulum-app.com</span>
        </div>
      </div>
    </div>,
    size,
  );
}
