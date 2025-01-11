import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { TopBar } from "@/components/TopBar";
import { SideRail } from "@/components/SideRail";
import { StatusFooter } from "@/components/StatusFooter";

export const metadata: Metadata = {
  metadataBase: new URL("https://biochain.example"),
  title: {
    default: "BioChain — Decentralized Clinical Trial Network",
    template: "%s · BioChain",
  },
  description:
    "BioChain tokenizes research IP, anchors verifiable trial data on-chain, and enables decentralized peer-review of clinical evidence.",
  applicationName: "BioChain",
  keywords: [
    "DeSci",
    "clinical trials",
    "IP-NFT",
    "blockchain",
    "biomedical research",
    "peer review",
  ],
  authors: [{ name: "BioChain Foundation" }],
  openGraph: {
    type: "website",
    title: "BioChain — Decentralized Clinical Trial Network",
    description:
      "Mint research IP-NFTs, fund trials with $BIO, anchor clinical data on-chain.",
    siteName: "BioChain",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#1e40af",
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased">
        <Providers>
          {/* Skip link for accessibility */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-clinical focus:bg-trust-800 focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
          >
            Skip to content
          </a>

          {/* Dashboard shell: top bar + side rail + main + status footer */}
          <div className="flex min-h-screen flex-col bg-canvas-subtle">
            <TopBar />

            <div className="flex flex-1 flex-col lg:flex-row">
              <SideRail />

              <main
                id="main-content"
                className="flex min-w-0 flex-1 flex-col"
                role="main"
              >
                <div className="flex-1">{children}</div>
                <StatusFooter />
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
