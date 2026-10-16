import { ClerkProviderWithLocalization } from "@/components/clerk-provider-with-localization";

export default function AuthLayout({
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
