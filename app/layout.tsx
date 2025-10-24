import "@/styles/globals.css";
import { Metadata, Viewport } from "next";
import { Link } from "@heroui/link";
import clsx from "clsx";

import { Providers } from "./providers";

import { siteConfig } from "@/config/site";
import { fontSans } from "@/config/fonts";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="en">
      <head />
      <body
        className={clsx(
          "min-h-screen text-foreground bg-background font-sans antialiased",
          fontSans.variable,
        )}
      >
        <Providers themeProps={{ attribute: "class", defaultTheme: "dark" }}>
          <div className="relative flex flex-col min-h-screen">
            <main className="container mx-auto max-w-7xl px-6 flex-grow flex flex-col">
              {children}
            </main>
            <footer className="w-full flex items-center justify-center py-3 mt-auto">
              <Link
                isExternal
                className="flex items-center gap-2 text-current"
                href="https://witty-river-08852a710.1.azurestaticapps.net"
                title="heroui.com homepage"
              >
                <span className="text-default-600">Powered by</span>
                <p className="text-primary">Finance AI</p>
              </Link>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
