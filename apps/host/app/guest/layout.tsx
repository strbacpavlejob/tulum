import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tulum — Discover Events & Meet People",
  description:
    "Discover events near you, see who’s going, and match with people already there. Tulum turns nights out into real-life connections.",
  alternates: {
    canonical: "/guest",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Tulum — Discover Events & Meet People",
    description:
      "Discover events near you, see who’s going, and match with people already there. Tulum turns nights out into real-life connections.",
    url: "https://tulum-app.com/guest",
    siteName: "Tulum",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/guest/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Tulum — discover events, meet people, and go out together.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tulum — Discover Events & Meet People",
    description:
      "Discover events near you, see who’s going, and match with people already there. Tulum turns nights out into real-life connections.",
    images: ["/guest/opengraph-image"],
  },
};

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
