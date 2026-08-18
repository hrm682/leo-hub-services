import { Link } from "@tanstack/react-router";
import { ShoppingCart, Star } from "lucide-react";

import { useCart } from "@/lib/cart";
import { fmtUSD } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  image_url: string | null;
  price: number | string;
  billing_label: string;
  duration_days?: number;
  is_featured?: boolean;
}

export function ProductImage({
  src,
  alt,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-background",
        className,
      )}
    >
      <img src="/images/brand/icon-lion.png" alt="" className="h-12 w-12 opacity-40" />
    </div>
  );
}

export function ProductCard({ product }: { product: CatalogProduct }) {
  const { addItem } = useCart();
  const price = Number(product.price);

  return (
    <article className="glass card-glow group flex flex-col overflow-hidden rounded-2xl">
      <Link
        to="/servicio/$slug"
        params={{ slug: product.slug }}
        className="relative block aspect-[16/9] overflow-hidden"
        aria-label={`Ver ${product.name}`}
      >
        <div className="h-full w-full transition-transform duration-500 group-hover:scale-105">
          <ProductImage src={product.image_url} alt={product.name} />
        </div>
        {product.is_featured && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-background/80 px-2.5 py-1 text-[11px] font-semibold text-primary backdrop-blur">
            <Star className="h-3 w-3 fill-current" />
            Destacado
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-base font-semibold leading-snug">
          <Link
            to="/servicio/$slug"
            params={{ slug: product.slug }}
            className="transition-colors hover:text-primary"
          >
            {product.name}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
          {product.short_description}
        </p>

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-border/60 pt-4">
          <div>
            <p className="font-display text-xl font-bold text-gold-gradient">{fmtUSD(price)}</p>
            <p className="text-xs capitalize text-muted-foreground">{product.billing_label}</p>
          </div>
          <Button
            size="sm"
            className="font-semibold"
            onClick={() =>
              addItem({
                productId: product.id,
                slug: product.slug,
                name: product.name,
                price,
                imageUrl: product.image_url,
                billingLabel: product.billing_label,
                durationDays: product.duration_days ?? 30,
              })
            }
          >
            <ShoppingCart className="mr-1.5 h-4 w-4" />
            Añadir
          </Button>
        </div>
      </div>
    </article>
  );
}
