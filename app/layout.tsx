import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const candidateHost = (requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000").split(",")[0].trim();
  const host = /^[a-z0-9.-]+(?::\d+)?$/i.test(candidateHost) ? candidateHost : "localhost:3000";
  const candidateProtocol = (requestHeaders.get("x-forwarded-proto") ?? "").split(",")[0].trim();
  const protocol = candidateProtocol === "http" || candidateProtocol === "https" ? candidateProtocol : host.startsWith("localhost") ? "http" : "https";
  const socialImage = new URL("/og.png", `${protocol}://${host}`).toString();

  return {
    title: "Career HQ | Private job search command center",
    description: "A fictional preview of Career HQ, a privacy-first Codex workspace for truthful applications, tailored resumes, and follow-ups.",
    openGraph: {
      title: "Career HQ",
      description: "A private, truthful job search command center.",
      type: "website",
      images: [{ url: socialImage, width: 1731, height: 909, alt: "Career HQ - Your search, in focus." }],
    },
    twitter: { card: "summary_large_image", images: [socialImage] },
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
