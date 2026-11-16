import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tulum — See who’s going. Match with who’s there.",
  description:
    "Find what’s on in Belgrade, join an event, and once you’re there, match with the people at the same party.",
  alternates: {
    canonical: "/guest",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Tulum — See who’s going. Match with who’s there.",
    description:
      "Find what’s on in Belgrade, join an event, and once you’re there, match with the people at the same party.",
    url: "https://tulum-app.com/guest",
    siteName: "Tulum",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/guest/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Tulum — see who’s going, match with who’s there.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tulum — See who’s going. Match with who’s there.",
    description:
      "Find what’s on in Belgrade, join an event, and once you’re there, match with the people at the same party.",
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
