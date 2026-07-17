import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./fonts.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Phendo Study",
  description: "Phendo Participatory Design Evaluation Harness",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
