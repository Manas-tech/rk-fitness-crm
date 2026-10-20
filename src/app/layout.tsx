import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IronPulse Gym CRM — Premium Fitness Club Management",
  description: "Enterprise Gym CRM, Membership Tracking, PT Revenue Sharing, and Automated Payroll System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-background text-ink-primary">
        {children}
      </body>
    </html>
  );
}
