import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";

export const listCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const db = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
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
  });

  const [{ data: categories }, { data: products }] = await Promise.all([
    db
      .from("categories")
      .select("id, name, slug, description, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
    db
      .from("products")
      .select(
        "id, category_id, name, slug, short_description, benefits, image_url, price, duration_days, billing_label, is_featured",
      )
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("price", { ascending: true }),
  ]);

  return { categories: categories ?? [], products: products ?? [] };
});

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ slug: z.string().trim().min(1).max(140) }).parse(data))
  .handler(async ({ data }) => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const db = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
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
    });

    const { data: product } = await db
      .from("products")
      .select(
        "id, category_id, name, slug, short_description, description, benefits, image_url, price, duration_days, billing_label, is_featured, categories(name, slug)",
      )
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();

    const { data: related } = await db
      .from("products")
      .select(
        "id, name, slug, short_description, image_url, price, billing_label, duration_days, is_featured",
      )
      .eq("is_active", true)
      .eq("category_id", product?.category_id ?? "")
      .neq("slug", data.slug)
      .limit(3);

    return { product: product ?? null, related: related ?? [] };
  });
