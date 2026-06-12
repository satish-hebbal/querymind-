import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Datagini",
  description: "Talk to your database",
  icons: {
    icon: "/animation-frames/gini-a1-f1.svg",
  },
};

const THEME_SCRIPT = `(function () {
  try {
    var theme = localStorage.getItem("datagini-theme");
    if (theme === "light") {
      document.documentElement.classList.add("light");
    }
  } catch (e) {}
})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="bg-bg text-ink antialiased">{children}</body>
    </html>
  );
}
