import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Minus, Plus, ShieldCheck, ShoppingCart, Trash2 } from "lucide-react";

import { useCart } from "@/lib/cart";
import { fmtUSD } from "@/lib/format";
import { useSession } from "@/lib/use-session";
import { ProductImage } from "@/components/site/ProductCard";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/carrito")({
  head: () => ({
    meta: [
      { title: "Tu carrito — Leo Hub" },
      { name: "description", content: "Revisa tu pedido antes de confirmar el pago." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, hydrated, subtotal, setQuantity, removeItem, clear } = useCart();
  const { data: user } = useSession();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Tu <span className="text-gold-gradient">carrito</span>
        </h1>

        {!hydrated ? (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
            <div className="space-y-4">
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : items.length === 0 ? (
          <div className="mt-16 flex flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mt-4 font-display text-lg font-semibold">Tu carrito está vacío</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Explora el catálogo y añade los servicios que quieras activar.
            </p>
            <Button asChild className="mt-6 font-semibold">
              <Link to="/catalogo">
                Explorar catálogo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
            <section aria-label="Servicios en el carrito" className="space-y-4">
              {items.map((item) => (
                <article
                  key={item.productId}
                  className="glass flex gap-4 rounded-2xl p-4 sm:items-center"
                >
                  <Link
                    to="/servicio/$slug"
                    params={{ slug: item.slug }}
                    className="h-20 w-28 shrink-0 overflow-hidden rounded-xl"
                  >
                    <ProductImage src={item.imageUrl} alt={item.name} />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-sm font-semibold sm:text-base">
                      <Link
                        to="/servicio/$slug"
                        params={{ slug: item.slug }}
                        className="transition-colors hover:text-primary"
                      >
                        {item.name}
                      </Link>
                    </h3>
                    <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                      {item.billingLabel} · {item.durationDays} días
                    </p>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center rounded-lg border border-border">
                        <button
                          aria-label={`Quitar una unidad de ${item.name}`}
                          className="px-2.5 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
                          onClick={() => setQuantity(item.productId, item.quantity - 1)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-8 text-center text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          aria-label={`Añadir una unidad de ${item.name}`}
                          className="px-2.5 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
                          onClick={() => setQuantity(item.productId, item.quantity + 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <p className="font-display text-base font-bold">
                          {fmtUSD(item.price * item.quantity)}
                        </p>
                        <button
                          aria-label={`Eliminar ${item.name} del carrito`}
                          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => removeItem(item.productId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}

              <div className="flex items-center justify-between pt-2">
                <Link
                  to="/catalogo"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  ← Seguir explorando
                </Link>
                <button
                  onClick={clear}
                  className="text-sm text-muted-foreground transition-colors hover:text-destructive"
                >
                  Vaciar carrito
                </button>
              </div>
            </section>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="glass card-glow rounded-2xl p-6">
                <h2 className="font-display text-lg font-bold">Resumen</h2>
                <dl className="mt-4 space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Subtotal</dt>
                    <dd className="font-semibold">{fmtUSD(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2.5">
                    <dt className="font-semibold">Total</dt>
                    <dd className="font-display text-xl font-extrabold text-gold-gradient">
                      {fmtUSD(subtotal)}
                    </dd>
                  </div>
                </dl>

                {user ? (
                  <Button asChild size="lg" className="mt-6 w-full font-semibold">
                    <Link to="/checkout">
                      Proceder al pago
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="lg" className="mt-6 w-full font-semibold">
                    <Link to="/auth" search={{ redirect: "/checkout" }}>
                      Inicia sesión para pagar
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                )}

                <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Pagarás con Binance Pay y subirás tu comprobante. Activamos tus servicios en
                  cuanto lo aprobemos.
                </p>
              </div>
            </aside>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
