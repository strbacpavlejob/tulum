import type { Metadata } from "next";
import PublicInfoPage from "@/components/sections/public-info-page";

export const metadata: Metadata = {
  title: "Support | Tulum",
  description: "Contact the Tulum team for account, app, event, or privacy help.",
};

export default function SupportPage() {
  return <PublicInfoPage page="support" />;
}
