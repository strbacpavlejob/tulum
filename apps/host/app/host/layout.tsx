import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tulum — Host Events & Manage Venues",
  description:
    "Tulum for Hosts — Create events, manage venues, and connect with guests. The all-in-one platform for event organizers and venue managers.",
  openGraph: {
    title: "Tulum — Host Events & Manage Venues",
    description:
      "Create events, manage venues, and connect with guests. The all-in-one platform for event organizers.",
  },
  twitter: {
    title: "Tulum — Host Events & Manage Venues",
    description:
      "Create events, manage venues, and connect with guests. The all-in-one platform for event organizers.",
  },
};

export default function HostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
