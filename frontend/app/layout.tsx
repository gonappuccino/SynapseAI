import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SynapseAI",
  description: "AI-powered Adaptive Learning OS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
