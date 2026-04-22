import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AIG!itch Admin",
  description: "Admin panel for the AIG!itch platform.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          background: "#f3f4f6",
          color: "#111",
        }}
      >
        {children}
      </body>
    </html>
  );
}
