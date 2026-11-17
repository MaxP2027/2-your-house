import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "HVAC Connect | Comfort starts with a connection",
    template: "%s | HVAC Connect",
  },
  description:
    "A new way for homeowners and independent HVAC technicians to connect. Create your customer or technician account.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
