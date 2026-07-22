import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const candidateHost = (requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:4173").split(",")[0].trim();
  const host = /^[a-z0-9.-]+(?::\d+)?$/i.test(candidateHost) ? candidateHost : "localhost:4173";
  const candidateProtocol = (requestHeaders.get("x-forwarded-proto") ?? "").split(",")[0].trim();
  const protocol = candidateProtocol === "http" || candidateProtocol === "https" ? candidateProtocol : host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const socialImage = new URL("/og.png", `${protocol}://${host}`).toString();

  return {
    title: "Career HQ | Your private job search, set up by Codex",
    description: "Share one website with Codex to create a private, local-first system for truthful job applications, tailored materials, and follow-ups.",
    openGraph: {
      title: "Career HQ",
      description: "Your private job search, set up by Codex.",
      type: "website",
      images: [{ url: socialImage, width: 1731, height: 909, alt: "Career HQ — Your private job search, set up by Codex." }],
    },
    twitter: { card: "summary_large_image", images: [socialImage] },
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
