import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tulum — Discover Events & Meet People",
  description:
    "Tulum for Guests — Discover the best events near you, match with people who are going, and turn nights out into real connections.",
  openGraph: {
    title: "Tulum — Discover Events & Meet People",
    description:
      "Discover events, match with people who are going, and turn nights out into real connections.",
  },
  twitter: {
    title: "Tulum — Discover Events & Meet People",
    description:
      "Discover events, match with people who are going, and turn nights out into real connections.",
  },
};

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
