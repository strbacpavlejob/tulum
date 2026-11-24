import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost:3001", "127.0.0.1:3001"],
  productionBrowserSourceMaps: true,
  images: {
    // Event and venue pictures are all stored in the R2 bucket and served
    // from its custom domain (docs/images-and-storage.md), so the image
    // optimizer takes no other site's pictures.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.tulum-app.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
