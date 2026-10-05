import Link from "next/link";
import { Container } from "@/components/common/container";
import { NewsletterForm } from "./newsletter-form";
import { brand } from "@/config/brand";

/**
 * Site footer.
 *
 * A Server Component — it renders static markup from brand config and ships no
 * JavaScript. Only the newsletter form inside it is a client component, which
 * is the pattern to aim for: keep interactivity at the leaves of the tree.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-footer-bg text-footer-foreground mt-auto">
      <Container>
        <div className="py-section grid gap-10 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          {/* Brand + newsletter */}
          <div>
            <p className="font-heading text-h4">{brand.logoText}</p>
            <p className="text-footer-muted text-body-sm mt-3 max-w-xs">{brand.description}</p>
            <div className="mt-6">
              <NewsletterForm />
            </div>
          </div>

          {/* Link columns */}
          {brand.footer.columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="text-body-sm font-semibold">{column.title}</h2>
              <ul className="mt-4 space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-footer-muted hover:text-footer-foreground text-body-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-footer-muted/25 flex flex-col gap-6 border-t py-8">
          <ul className="flex flex-wrap gap-4">
            {brand.footer.social.map((social) => (
              <li key={social.href}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-footer-muted hover:text-footer-foreground text-body-sm transition-colors"
                >
                  {social.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {brand.footer.paymentMethods.map((method) => (
                <span
                  key={method}
                  className="border-footer-muted/30 text-footer-muted rounded-button text-body-xs border px-2 py-1"
                >
                  {method}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {brand.footer.legal.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-footer-muted hover:text-footer-foreground text-body-xs transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <p className="text-footer-muted text-body-xs">
                © {year} {brand.name}
              </p>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
}
