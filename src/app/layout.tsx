import type { Metadata } from "next";
import "./globals.css";

const title = "HVAC Connect | Find independent heating and cooling technicians";
const description =
  "Find HVAC technicians by service city, request an appointment, and keep your heating and cooling conversations in one place.";

export const metadata: Metadata = {
  title: { default: title, template: "%s | HVAC Connect" },
  description,
  openGraph: { title, description, siteName: "HVAC Connect", type: "website" },
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
