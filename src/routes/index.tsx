import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, LifeBuoy, RefreshCcw, ShieldCheck, Sparkles } from "lucide-react";

import { catalogQueryOptions } from "@/lib/queries";
import { ProductCard } from "@/components/site/ProductCard";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQueryOptions),
  head: () => ({
    meta: [
      { title: "Leo Hub — Todo tu servicio, en un solo lugar" },
      {
        name: "description",
        content:
          "Leo Hub: compra, gestiona y renueva tus servicios digitales con soporte premium. Tu tranquilidad también es parte del servicio.",
      },
      { property: "og:title", content: "Leo Hub — Todo tu servicio, en un solo lugar" },
      {
        property: "og:description",
        content:
          "Compra, renueva y recibe soporte de tus servicios digitales desde un portal elegante y seguro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const FEATURES = [
  {
    icon: Sparkles,
    title: "Compra sin fricción",
    text: "Elige tu servicio, paga por Binance y sube tu comprobante en segundos.",
  },
  {
    icon: RefreshCcw,
    title: "Renovaciones claras",
    text: "Vigencia visible siempre. Renueva antes del vencimiento sin perder días.",
  },
  {
    icon: LifeBuoy,
    title: "Soporte que responde",
    text: "Tickets con seguimiento real y un equipo que te acompaña hasta resolver.",
  },
];

function LandingPage() {
  const { data } = useSuspenseQuery(catalogQueryOptions);
  const featured = data.products.filter((p) => p.is_featured).slice(0, 3);
  const showcase = featured.length > 0 ? featured : data.products.slice(0, 3);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-1/2 h-[30rem] w-[60rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(closest-side, oklch(0.82 0.152 86), transparent)" }}
      />

      <SiteHeader />

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-6">
        <section className="py-16 text-center sm:py-24">
          <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Portal premium de servicios digitales
          </p>
          <h1 className="mx-auto max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            Todo tu servicio, <span className="text-gold-gradient">en un solo lugar.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            Compra, renueva y gestiona tus servicios digitales con una experiencia elegante y un
            soporte que sí responde. Tu tranquilidad también es parte del servicio.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="font-semibold">
              <Link to="/catalogo">
                Explorar catálogo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Ya soy cliente</Link>
            </Button>
          </div>
        </section>

        {showcase.length > 0 && (
          <section className="pb-20">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold">Servicios destacados</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Los favoritos de nuestros clientes, listos para activar.
                </p>
              </div>
              <Link
                to="/catalogo"
                className="hidden items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-primary/80 sm:inline-flex"
              >
                Ver catálogo completo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {showcase.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <div className="mt-6 text-center sm:hidden">
              <Button asChild variant="outline">
                <Link to="/catalogo">Ver catálogo completo</Link>
              </Button>
            </div>
          </section>
        )}

        <section className="grid gap-4 pb-20 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass card-glow rounded-2xl p-6 text-left">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h2 className="mt-4 font-display text-lg font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
