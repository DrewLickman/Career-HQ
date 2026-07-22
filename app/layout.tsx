import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Career HQ | Local job search command center",
  description: "A private local dashboard powered by your ignored Career HQ workspace.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
