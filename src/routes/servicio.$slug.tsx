import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, useNavigate, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  LifeBuoy,
  ShieldCheck,
  ShoppingCart,
  Zap,
} from "lucide-react";

import { useCart } from "@/lib/cart";
import { fmtUSD } from "@/lib/format";
import { productQueryOptions } from "@/lib/queries";
import { isSoldOut, ProductCard, ProductImage } from "@/components/site/ProductCard";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/servicio/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(productQueryOptions(params.slug));
    if (!data.product) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.product?.name ?? "Streaming"} — LoMaximoLeo` },
      {
        name: "description",
        content:
          loaderData?.product?.short_description ||
          "Cuenta de streaming de LoMaximoLeo con soporte premium.",
        },
      { property: "og:title", content: `${loaderData?.product?.name ?? "Streaming"} — LoMaximoLeo` },
      {
        property: "og:description",
        content: loaderData?.product?.short_description || "Cuenta de streaming de LoMaximoLeo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProductPage,
  notFoundComponent: ProductNotFound,
  errorComponent: ProductError,
});

function ProductNotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="font-display text-2xl font-bold">Servicio no disponible</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este servicio ya no está en el catálogo o el enlace es incorrecto.
          </p>
          <Button asChild className="mt-6">
            <Link to="/catalogo">Ver catálogo</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProductError({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="font-display text-xl font-semibold">No pudimos cargar el servicio</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          <Button className="mt-6" onClick={() => router.invalidate()}>
            Reintentar
          </Button>
        </div>
      </div>
    </div>
  );
}

const TRUST_ITEMS = [
  { icon: Zap, label: "Activación tras aprobar tu pago" },
  { icon: ShieldCheck, label: "Pago verificado por Binance" },
  { icon: LifeBuoy, label: "Soporte incluido" },
];

function ProductPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(productQueryOptions(slug));
  const { addItem } = useCart();
  const navigate = useNavigate();

  const product = data.product;
  if (!product) return null;

  const category = Array.isArray(product.categories)
    ? (product.categories[0] ?? null)
    : product.categories;
  const price = Number(product.price);
  const soldOut = isSoldOut(product.stock);

  function addToCart() {
    addItem({
      productId: product!.id,
      slug: product!.slug,
      name: product!.name,
      price,
      imageUrl: product!.image_url,
      billingLabel: product!.billing_label,
      durationDays: product!.duration_days,
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Link
          to="/catalogo"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al catálogo
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div className="glass card-glow overflow-hidden rounded-2xl">
            <div className="aspect-[16/10]">
              <ProductImage src={product.image_url} alt={product.name} />
            </div>
          </div>

          <div>
            {category && (
              <Link
                to="/catalogo"
                search={{ categoria: category.slug, q: "" }}
                className="inline-flex rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                {category.name}
              </Link>
            )}
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              {product.name}
            </h1>
            <p className="mt-3 text-base text-muted-foreground">{product.short_description}</p>

            <div className="mt-6 flex items-end gap-3">
              <p className="font-display text-4xl font-extrabold text-gold-gradient">
                {fmtUSD(price)}
              </p>
              <p className="pb-1.5 text-sm capitalize text-muted-foreground">
                / {product.billing_label}
              </p>
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5 text-primary" />
              Vigencia de {product.duration_days} días desde la activación
            </p>

            {product.benefits.length > 0 && (
              <ul className="mt-6 space-y-2.5">
                {product.benefits.map((benefit: string) => (
                  <li key={benefit} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            )}

            {soldOut && (
              <p className="mt-6 inline-flex items-center rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
                Este servicio está agotado por ahora. Vuelve pronto o contáctanos.
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="font-semibold" onClick={addToCart} disabled={soldOut}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                {soldOut ? "Agotado" : "Añadir al carrito"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="font-semibold"
                disabled={soldOut}
                onClick={() => {
                  addToCart();
                  navigate({ to: "/carrito" });
                }}
              >
                Comprar ahora
              </Button>
            </div>

            <div className="mt-8 grid gap-2 rounded-xl border border-border bg-secondary/30 p-4 sm:grid-cols-3">
              {TRUST_ITEMS.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <item.icon className="h-4 w-4 shrink-0 text-primary" />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {product.description && (
          <section className="mt-12">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold">
              <BadgeCheck className="h-5 w-5 text-primary" />
              Detalles del servicio
            </h2>
            <p className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          </section>
        )}

        {data.related.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display text-xl font-bold">También te puede interesar</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.related.map((related) => (
                <ProductCard key={related.id} product={related} />
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
