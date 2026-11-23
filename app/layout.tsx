import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";

import { getSiteUrl, SITE_DESCRIPTION } from "@/lib/site";

import "./globals.css";

const siteUrl = getSiteUrl();
const title = "Wingman by fakehecker";
const description = SITE_DESCRIPTION;

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: title,
    template: "%s · Wingman",
  },
  description,
  applicationName: "Wingman",
  keywords: [
    "reply suggestions",
    "texting coach",
    "chat screenshot AI",
    "dating app replies",
    "conversation starters",
    "AI wingman",
  ],
  authors: [{ name: "Wingman" }],
  creator: "Wingman",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Wingman",
    title,
    description,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Wingman — turn chat screenshots into replies that sound like you.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF8F3" },
    { media: "(prefers-color-scheme: dark)", color: "#191817" },
  ],
};

// Applied before paint so dark mode does not flash on load.
const themeScript = `(function(){try{var stored=localStorage.getItem('wingman-theme');var dark=stored?stored==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(dark){document.documentElement.classList.add('dark');}document.documentElement.style.colorScheme=dark?'dark':'light';}catch(e){}})();`;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Wingman",
  url: siteUrl.toString(),
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Any",
  description,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={GeistSans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
