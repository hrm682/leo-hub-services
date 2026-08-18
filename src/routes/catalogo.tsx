import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { PackageSearch, Search } from "lucide-react";

import { catalogQueryOptions } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/site/ProductCard";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/catalogo")({
  validateSearch: (search: Record<string, unknown>): { categoria?: string; q?: string } => {
    const parsed: { categoria?: string; q?: string } = {};
    const categoria = search["categoria"];
    const q = search["q"];
    if (typeof categoria === "string" && categoria) parsed.categoria = categoria;
    if (typeof q === "string" && q) parsed.q = q;
    return parsed;
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQueryOptions),
  head: () => ({
    meta: [
      { title: "Catálogo de servicios — Leo Hub" },
      {
        name: "description",
        content:
          "Explora el catálogo de Leo Hub: streaming, música, VPN, nube, ofimática y más servicios digitales con soporte premium.",
      },
      { property: "og:title", content: "Catálogo de servicios — Leo Hub" },
      {
        property: "og:description",
        content: "Servicios digitales verificados con activación rápida y soporte real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CatalogPage,
  errorComponent: CatalogError,
});

function CatalogError({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="font-display text-xl font-semibold">No pudimos cargar el catálogo</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          <Button className="mt-6" onClick={() => router.invalidate()}>
            Reintentar
          </Button>
        </div>
      </div>
    </div>
  );
}

function CatalogPage() {
  const { data } = useSuspenseQuery(catalogQueryOptions);
  const { categoria = "", q = "" } = Route.useSearch();
  const navigate = useNavigate({ from: "/catalogo" });

  const selectedCategory = data.categories.find((c) => c.slug === categoria) ?? null;
  const term = q.trim().toLowerCase();

  const products = data.products.filter((p) => {
    if (selectedCategory && p.category_id !== selectedCategory.id) return false;
    if (term) {
      const haystack = `${p.name} ${p.short_description}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Catálogo de <span className="text-gold-gradient">servicios</span>
            </h1>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground sm:text-base">
              Servicios digitales verificados. Paga con Binance, sube tu comprobante y activa tu
              servicio sin fricción.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) =>
                navigate({
                  search: (prev) => ({ ...prev, q: e.target.value }),
                  replace: true,
                })
              }
              placeholder="Buscar servicio…"
              className="pl-9"
              aria-label="Buscar en el catálogo"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() =>
              navigate({ search: (prev) => ({ ...prev, categoria: "" }), replace: true })
            }
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              !selectedCategory
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-border bg-secondary/40 text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            Todos
          </button>
          {data.categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() =>
                navigate({ search: (prev) => ({ ...prev, categoria: cat.slug }), replace: true })
              }
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                selectedCategory?.id === cat.id
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border bg-secondary/40 text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {products.length === 0 ? (
          <div className="mt-16 flex flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <PackageSearch className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mt-4 font-display text-lg font-semibold">Sin resultados</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              No encontramos servicios con esos filtros. Prueba con otra categoría o búsqueda.
            </p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => navigate({ search: { categoria: "", q: "" }, replace: true })}
            >
              Limpiar filtros
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
