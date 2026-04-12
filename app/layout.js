import "./globals.css";
import { Toaster } from "sonner";
import Header from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";

/**
 * Root Layout Metadata
 * Applied to all pages unless overridden by a page-level metadata export.
 * Children can override title, description, and OG fields on a per-page basis
 * using: export const metadata = { title: "Page Title" }
 */
export const metadata = {
  // metadataBase is required for OG/Twitter absolute image URLs to resolve correctly
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://ai-career-coach.vercel.app"
  ),

  // Title template: child pages set `title: "Dashboard"` → renders "Dashboard | AI Career Coach"
  title: {
    default: "AI Career Coach",
    template: "%s | AI Career Coach",
  },

  description:
    "AI-powered career coaching platform. Get personalized industry insights, " +
    "AI-optimized resume building, cover letter generation, and mock interview prep.",

  // Open Graph — controls how links appear when shared on social platforms
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "AI Career Coach",
    title: "AI Career Coach",
    description:
      "AI-powered career coaching: industry insights, resume building, " +
      "cover letters, and interview prep — all in one platform.",
    images: [
      {
        url: "/og-image.png", // Place a 1200×630 image at /public/og-image.png
        width: 1200,
        height: 630,
        alt: "AI Career Coach — Your AI-powered career partner",
      },
    ],
  },

  // Twitter / X Card
  twitter: {
    card: "summary_large_image",
    title: "AI Career Coach",
    description:
      "AI-powered career coaching: industry insights, resume building, " +
      "cover letters, and interview prep.",
    images: ["/og-image.png"],
    creator: "@aicareercoach", // Update to your Twitter/X handle
  },

  // Search engine directives
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.png" sizes="any" />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Header />
          <main className="min-h-screen">{children}</main>
          <Toaster richColors />

          <footer className="bg-muted/50 py-12">
            <div className="container mx-auto px-4 text-center text-gray-200">
              <p>Made with love </p>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}

