import { createServerFn } from "@tanstack/react-start";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";

type ListProduct = {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  short_description: string;
  benefits: string[];
  image_url: string | null;
  price: number;
  duration_days: number;
  billing_label: string;
  is_featured: boolean;
  stock: number | null;
};

type RelatedProduct = {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  image_url: string | null;
  price: number;
  billing_label: string;
  duration_days: number;
  is_featured: boolean;
  stock: number | null;
};

type DetailProduct = ListProduct & {
  description: string;
  categories: { name: string; slug: string } | { name: string; slug: string }[] | null;
};

/** Cliente anónimo (solo lectura de contenido público). */
function anonClient(): SupabaseClient {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  }) as unknown as SupabaseClient;
}

/** ¿El error viene de que la columna `stock` aún no existe (migración sin aplicar)? */
function isMissingStock(error: { message?: string } | null): boolean {
  return Boolean(error?.message && /stock/i.test(error.message));
}

const LIST_BASE =
  "id, category_id, name, slug, short_description, benefits, image_url, price, duration_days, billing_label, is_featured";
const RELATED_BASE =
  "id, name, slug, short_description, image_url, price, billing_label, duration_days, is_featured";

export const listCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const db = anonClient();

  const buildProducts = (cols: string) =>
    db
      .from("products")
      .select(cols)
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("price", { ascending: true });

  const [{ data: categories }, productsRes] = await Promise.all([
    db
      .from("categories")
      .select("id, name, slug, description, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
    buildProducts(`${LIST_BASE}, stock`),
  ]);

  // Fallback: si aún no existe la columna `stock`, se trata como ilimitado.
  let products = (productsRes.data as ListProduct[] | null) ?? null;
  if (productsRes.error && isMissingStock(productsRes.error)) {
    const { data } = await buildProducts(LIST_BASE);
    products = ((data as Omit<ListProduct, "stock">[] | null) ?? []).map((p) => ({
      ...p,
      stock: null,
    }));
  }

  return { categories: categories ?? [], products: products ?? [] };
});

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ slug: z.string().trim().min(1).max(140) }).parse(data))
  .handler(async ({ data }) => {
    const db = anonClient();

    const withStock = await db
      .from("products")
      .select(`${LIST_BASE}, description, stock, categories(name, slug)`)
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();

    let product = withStock.data as DetailProduct | null;
    if (!product) {
      const retry = await db
        .from("products")
        .select(`${LIST_BASE}, description, categories(name, slug)`)
        .eq("slug", data.slug)
        .eq("is_active", true)
        .maybeSingle();
      const row = retry.data as Omit<DetailProduct, "stock"> | null;
      if (row) product = { ...row, stock: null };
    }

    const buildRelated = (cols: string) =>
      db
        .from("products")
        .select(cols)
        .eq("is_active", true)
        .eq("category_id", product?.category_id ?? "")
        .neq("slug", data.slug)
        .limit(3);

    const relatedRes = await buildRelated(`${RELATED_BASE}, stock`);
    let related = (relatedRes.data as RelatedProduct[] | null) ?? null;
    if (relatedRes.error && isMissingStock(relatedRes.error)) {
      const { data: r } = await buildRelated(RELATED_BASE);
      related = ((r as Omit<RelatedProduct, "stock">[] | null) ?? []).map((p) => ({
        ...p,
        stock: null,
      }));
    }

    return { product: product ?? null, related: related ?? [] };
  });
