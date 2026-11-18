import type { Metadata } from "next";
import PublicInfoPage from "@/components/sections/public-info-page";

export const metadata: Metadata = {
  title: "Child safety standards | Tulum",
  description:
    "Tulum's standards against child sexual abuse and exploitation, how to report it, and how we act on reports.",
};

export default function ChildSafetyPage() {
  return <PublicInfoPage page="child-safety" />;
}
