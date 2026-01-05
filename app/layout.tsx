import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vestige View Analytics Dashboard",
  description: "Multi-source analytics dashboard for Vestige Digital",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
