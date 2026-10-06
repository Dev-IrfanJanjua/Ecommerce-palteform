import { Badge } from "@/components/ui/badge";
import type { Product } from "@/types/catalog";
import { isOnSale, isSoldOut } from "@/lib/api/products";

/**
 * Status badges shown on a product card and on the product page.
 *
 * Priority matters: "Sold out" overrides everything, because a shopper needs
 * to know they cannot buy it before they notice it is on sale.
 */
export function ProductBadges({ product }: { product: Product }) {
  if (isSoldOut(product)) {
    return <Badge variant="secondary">Sold out</Badge>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {isOnSale(product) ? <Badge className="bg-sale text-sale-foreground">Sale</Badge> : null}
      {product.isNew ? <Badge className="bg-badge-new text-badge-new-foreground">New</Badge> : null}
      {product.isBestseller ? (
        <Badge className="bg-badge-bestseller text-badge-bestseller-foreground">Bestseller</Badge>
      ) : null}
    </div>
  );
}
