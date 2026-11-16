import type { Metadata } from "next";
import PublicInfoPage from "@/components/sections/PublicInfoPage";

export const metadata: Metadata = {
  title: "Delete your account | Tulum",
  description:
    "How to delete your Tulum account in the app or by email, what is deleted and what is kept.",
};

export default function DeleteAccountPage() {
  return <PublicInfoPage page="delete-account" />;
}
