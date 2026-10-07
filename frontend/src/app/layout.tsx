import type { Metadata } from "next";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Toaster } from "@/components/ui/sonner";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { StoreProvider } from "@/store/provider";
import { brand } from "@/config/brand";
import { fontVariables } from "@/styles/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${brand.name} — ${brand.tagline}`,
    template: `%s — ${brand.name}`,
  },
  description: brand.description,
};

/**
 * Root layout — wraps every page in the site shell.
 *
 * Because this lives at the top of the App Router tree, the announcement bar,
 * header and footer render once and persist across navigations. Pages only
 * need to supply their own <main>.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {/* Lets keyboard users jump straight past the nav to the content. */}
        <a
          href="#main"
          className="bg-primary text-primary-foreground focus:ring-ring focus:rounded-button sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:ring-2"
        >
          Skip to content
        </a>

        {/* StoreProvider is a client component, but its children stay Server
            Components — it only supplies context, it does not render them. */}
        <StoreProvider>
          <AnnouncementBar />
          <Header />
          {children}
          <Footer />
          <CartDrawer />
          {/* Single toast host for the whole app. */}
          <Toaster position="bottom-right" />
        </StoreProvider>
      </body>
    </html>
  );
}
