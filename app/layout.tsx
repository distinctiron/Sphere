import type { Metadata } from "next";
import { Caveat, Figtree, JetBrains_Mono, Literata } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/session-provider";
import { Toaster } from "sonner";

const hand = Caveat({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-hand" });
const body = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });
const code = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-code" });
const serif = Literata({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Sphere",
  description: "AI-powered research companion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${hand.variable} ${body.variable} ${code.variable} ${serif.variable}`}>
      <body>
        <Providers>{children}</Providers>
        <Toaster
          position="top-right"
          toastOptions={{
            className: "sk-sheet",
            style: { background: "#fffefa", color: "#22252e", fontFamily: "var(--font-body)" },
          }}
        />
      </body>
    </html>
  );
}
