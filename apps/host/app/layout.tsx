import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ClerkProviderWithLocalization } from "@/components/clerk-provider-with-localization";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tulum.app"),
  title: "Tulum — Real Events & Dates",
  description:
    "Tulum — Discover Events. Meet People. Go Out Together. Tulum is an event-based social app that helps you discover events, meet people who are already going, and turn nights out into real connections.",
  keywords: [
    "event dating app",
    "social events",
    "nightlife app",
    "meet people at events",
    "belgrade events",
    "party app",
    "real life dating",
  ],
  openGraph: {
    title: "Tulum — Discover Events. Meet People. Go Out Together.",
    description:
      "Event-based social app where the event is the context, the swipe is the tool, and the connection is real.",
    type: "website",
    url: "https://tulum.app",
    images: [
      {
        url: "https://tulum.app/og-image.jpg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tulum — Discover Events. Meet People. Go Out Together.",
    description:
      "Event-based social app where the event is the context, the swipe is the tool, and the connection is real.",
    images: [
      {
        url: "https://tulum.app/og-image.jpg",
      },
    ],
  },
  authors: [{ name: "Tulum Team" }],
  icons: {
    icon: [
      { url: "/icon/favicon.ico" },
      { url: "/icon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icon/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      {
        url: "/icon/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    other: [{ rel: "manifest", url: "/icon/site.webmanifest" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProviderWithLocalization>
      <html lang="en" suppressHydrationWarning>
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  try {
                    var preferences = localStorage.getItem('tulum-preferences');
                    if (preferences) {
                      var state = JSON.parse(preferences).state;
                      if (state.theme === 'dark') {
                        document.documentElement.classList.add('dark');
                      } else if (state.theme === 'light') {
                        document.documentElement.classList.remove('dark');
                      } else if (state.theme === 'system') {
                        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                          document.documentElement.classList.add('dark');
                        }
                      }
                    }
                    var i18nextLng = localStorage.getItem('i18nextLng');
                    if (i18nextLng && ['en', 'sr', 'ru'].indexOf(i18nextLng) !== -1) {
                      document.documentElement.setAttribute('lang', i18nextLng);
                    }
                  } catch (e) {}
                })();
              `,
            }}
          />
          <link
            rel="icon"
            type="image/png"
            href="/icon/favicon-96x96.png"
            sizes="96x96"
          />
          <link rel="icon" type="image/svg+xml" href="/icon/favicon.svg" />
          <link rel="shortcut icon" href="/icon/favicon.ico" />
          <link
            rel="apple-touch-icon"
            sizes="180x180"
            href="/icon/apple-touch-icon.png"
          />
          <meta name="apple-mobile-web-app-title" content="Tulum" />
          <link rel="manifest" href="/icon/site.webmanifest" />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </body>
      </html>
    </ClerkProviderWithLocalization>
  );
}
