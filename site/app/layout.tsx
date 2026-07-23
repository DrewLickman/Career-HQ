import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1320" },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const candidateHost = (requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:4173").split(",")[0].trim();
  const host = /^[a-z0-9.-]+(?::\d+)?$/i.test(candidateHost) ? candidateHost : "localhost:4173";
  const candidateProtocol = (requestHeaders.get("x-forwarded-proto") ?? "").split(",")[0].trim();
  const protocol = candidateProtocol === "http" || candidateProtocol === "https" ? candidateProtocol : host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const socialImage = new URL("/og.png", `${protocol}://${host}`).toString();

  return {
    title: "Career HQ | Private job-search system for Windows",
    description: "Give this setup guide to Codex to install a private Career HQ workspace for verified profiles, job evaluation, truthful application materials, approvals, and follow-ups.",
    openGraph: {
      title: "Career HQ",
      description: "Set up a private job-search system on your Windows PC.",
      type: "website",
      images: [{ url: socialImage, width: 1728, height: 910, alt: "CHQ — Set up a private job-search system on your Windows PC." }],
    },
    twitter: { card: "summary_large_image", images: [socialImage] },
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
