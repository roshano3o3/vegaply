import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vegaply – AI Job Search | Apply Before Everyone Else",
  description:
    "Find jobs posted in the last 24 hours, get AI resume match scores, detect H1B sponsorship, and track every application. Get hired faster with Vegaply.",
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: '/vegaply-icon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: "Vegaply – AI Job Search | Apply Before Everyone Else",
    description:
      "Find jobs posted in the last 24 hours, get AI resume match scores, detect H1B sponsorship, and track every application. Get hired faster with Vegaply.",
    url: "https://vegaply.com",
    siteName: "Vegaply",
    images: [
      {
        url: "https://vegaply.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Vegaply – AI Job Search",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vegaply – AI Job Search | Apply Before Everyone Else",
    description:
      "Find jobs posted in the last 24 hours, get AI resume match scores, detect H1B sponsorship, and track every application.",
    images: ["https://vegaply.com/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${sora.variable} antialiased`}
    >
      <body className="min-h-full">{children}</body>

      {/*
        Google Analytics 4
        Tracks page views and user events.
        TODO: Replace "G-XXXXXXXXXX" with your real Measurement ID from:
        https://analytics.google.com → Admin → Data Streams → your stream → Measurement ID
      */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-XXXXXXXXXX');
      `}</Script>

      {/*
        Hotjar
        Records session replays and heatmaps to understand user behavior.
        TODO: Replace 0000000 with your real Site ID from:
        https://insights.hotjar.com → Settings → Sites & Organizations → your site → Site ID
      */}
      <Script id="hotjar-init" strategy="afterInteractive">{`
        (function(h,o,t,j,a,r){
          h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
          h._hjSettings={hjid:0000000,hjsv:6};
          a=o.getElementsByTagName('head')[0];
          r=o.createElement('script');r.async=1;
          r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
          a.appendChild(r);
        })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
      `}</Script>
    </html>
  );
}
