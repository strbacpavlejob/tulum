import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Tulum — Real Events. Real People. Real Moments.";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

function toBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize),
    );
  }

  return btoa(binary);
}

export default async function OpenGraphImage() {
  const mascotResponse = await fetch(
    "https://tulum-app.com/images/mascots/swipe-image.png",
  );

  if (!mascotResponse.ok) {
    throw new Error(
      `Unable to load the Tulum hero mascot: ${mascotResponse.status}`,
    );
  }

  const mascot = `data:image/png;base64,${toBase64(
    new Uint8Array(await mascotResponse.arrayBuffer()),
  )}`;

  return new ImageResponse(
    <div
      style={{
        position: "relative",
        display: "flex",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor: "#090612",
        backgroundImage:
          "radial-gradient(ellipse at 79% 32%, rgba(236, 72, 153, 0.3) 0%, transparent 38%), radial-gradient(ellipse at 70% 78%, rgba(37, 99, 235, 0.2) 0%, transparent 38%), radial-gradient(ellipse at 15% 12%, rgba(124, 58, 237, 0.18) 0%, transparent 36%)",
        color: "#ffffff",
        fontFamily: "Geist Mono, sans-serif",
      }}
    >
      <img
        src={mascot}
        alt=""
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: 500,
          height: 630,
          objectFit: "contain",
          objectPosition: "right bottom",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 600,
          width: 220,
          background:
            "linear-gradient(90deg, #090612 0%, rgba(9, 6, 18, 0.8) 48%, rgba(9, 6, 18, 0) 100%)",
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
          padding: "44px 72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 50,
              height: 50,
              borderRadius: 16,
            }}
          >
            <svg
              width="38"
              height="32"
              viewBox="0 0 744 622"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M36.9492 341.045C101.849 487.045 298.449 581.945 362.649 609.745C365.449 610.745 368.349 611.145 371.149 611.145C374.049 611.045 376.749 610.445 379.249 609.345C381.749 608.245 384.049 606.645 385.949 604.545C387.849 602.545 389.449 600.045 390.649 597.245C413.149 531.045 474.749 321.645 409.949 175.545C382.349 113.445 336.349 62.6453 281.849 34.2453C227.449 5.84527 169.049 2.24527 119.649 24.2453C70.1492 46.1453 33.6492 91.8452 18.1492 151.245C2.64925 210.645 9.44924 278.945 36.9492 341.045Z"
                fill="#18181b"
                stroke="#6747f7"
                strokeWidth="20"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <path
                d="M706.349 341.045C641.549 487.045 444.949 581.945 380.749 609.745C377.849 610.745 374.949 611.145 372.149 611.145C369.349 611.045 366.649 610.445 364.149 609.345C361.549 608.245 359.349 606.645 357.349 604.545C355.449 602.545 353.849 600.045 352.749 597.245C330.149 531.045 268.649 321.645 333.449 175.545C360.949 113.445 407.049 62.6453 461.449 34.2453C515.949 5.84527 574.249 2.24527 623.749 24.2453C673.149 46.1453 709.649 91.8452 725.149 151.245C740.649 210.645 733.849 278.945 706.349 341.045Z"
                fill="#6747f7"
                stroke="#6747f7"
                strokeWidth="20"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <path
                d="M200.349 294.845C159.349 294.845 126.249 261.745 126.249 220.745C126.249 179.745 159.349 146.645 200.349 146.645C241.349 146.645 274.449 179.745 274.449 220.745C274.449 261.745 241.349 294.845 200.349 294.845Z"
                fill="#6747f7"
                stroke="#18181b"
                strokeWidth="20"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <path
                d="M532.349 307.845C491.349 307.845 458.249 274.745 458.249 233.745C458.249 192.745 491.349 159.645 532.349 159.645C573.349 159.645 606.449 192.745 606.449 233.745C606.449 274.745 573.349 307.845 532.349 307.845Z"
                fill="#18181b"
                stroke="#6747f7"
                strokeWidth="20"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span
            style={{
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: -0.5,
            }}
          >
            Tulum
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 560,
            gap: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 56,
              fontWeight: 700,
              lineHeight: 1.04,
              letterSpacing: -1.8,
            }}
          >
            <span>Real Events.</span>
            <span>Real People.</span>
            <span style={{ color: "#6747f7" }}>Real Moments.</span>
          </div>
          <div
            style={{
              maxWidth: 500,
              color: "#ded9e9",
              fontSize: 21,
              lineHeight: 1.38,
            }}
          >
            Discover events, meet people who are actually there, and turn nights
            out into real connections.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                borderRadius: 999,
                background: "#ffffff",
                color: "#170e2a",
                padding: "12px 20px",
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              Join Tulum for Free
            </div>
            {/* <span
              style={{
                color: "#d0c9dd",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              App Store · Google Play
            </span> */}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
            gap: 32,
            color: "#c6c0d8",
            fontSize: 18,
          }}
        >
          <span>Discover. Match. Meet.</span>
          <span>tulum-app.com</span>
        </div>
      </div>
    </div>,
    size,
  );
}
