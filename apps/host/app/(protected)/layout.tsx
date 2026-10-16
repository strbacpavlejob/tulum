import { ClerkProviderWithLocalization } from "@/components/clerk-provider-with-localization";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProviderWithLocalization>
      {children}
    </ClerkProviderWithLocalization>
  );
}
