import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { z } from "zod";

import { listProductsAdmin, upsertProductAdmin } from "@/lib/admin.functions";
import { fmtUSD } from "@/lib/format";
import { productInputSchema } from "@/lib/schemas";
import { TONE_CLASSES } from "@/lib/status";
import { useIsStaff, useSession } from "@/lib/use-session";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/admin/productos")({
  head: () => ({
    meta: [
      { title: "Productos — LoMaximoLeo Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProductosPage,
});

const IMAGE_PRESETS = [
  { value: "/images/products/netflix.jpg", label: "Netflix" },
  { value: "/images/products/disney.jpg", label: "Disney+" },
  { value: "/images/products/hbomax.jpg", label: "HBO Max" },
  { value: "/images/products/primevideo.jpg", label: "Prime Video" },
  { value: "/images/products/paramount.jpg", label: "Paramount+" },
  { value: "/images/products/vix.jpg", label: "ViX" },
  { value: "/images/products/directvgo.jpg", label: "DirecTV GO" },
  { value: "/images/products/youtube.jpg", label: "YouTube" },
  { value: "/images/products/spotify.jpg", label: "Spotify" },
  { value: "/images/products/combo.jpg", label: "Combo" },
  { value: "/images/products/streaming.jpg", label: "Streaming" },
  { value: "/images/products/musica.jpg", label: "Música" },
  { value: "/images/products/vpn.jpg", label: "VPN" },
  { value: "/images/products/gaming.jpg", label: "Gaming" },
  { value: "/images/products/nube.jpg", label: "Nube" },
  { value: "/images/products/ofimatica.jpg", label: "Ofimática" },
  { value: "/images/products/diseno.jpg", label: "Diseño" },
  { value: "/images/products/antivirus.jpg", label: "Antivirus" },
];

const DEFAULT_IMAGE = "/images/products/streaming.jpg";

const BILLING_OPTIONS = ["mensual", "trimestral", "semestral", "anual", "único"];

interface ProductFormState {
  id?: string;
  categoryId: string | null;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  benefitsText: string;
  imagePreset: string;
  customImage: string;
  price: string;
  durationDays: string;
  billingLabel: string;
  isActive: boolean;
  isFeatured: boolean;
  stock: string;
}

const EMPTY_FORM: ProductFormState = {
  categoryId: null,
  name: "",
  slug: "",
  shortDescription: "",
  description: "",
  benefitsText: "",
  imagePreset: DEFAULT_IMAGE,
  customImage: "",
  price: "",
  durationDays: "30",
  billingLabel: "mensual",
  isActive: true,
  isFeatured: false,
  stock: "",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type ProductPayload = z.infer<typeof productInputSchema>;

type ProductRow = Awaited<ReturnType<typeof listProductsAdmin>>["products"][number];

function ProductosPage() {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const { isAdmin, isLoading: rolesLoading } = useIsStaff(user?.id);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-productos"],
    queryFn: () => listProductsAdmin(),
    enabled: isAdmin,
  });

  const saveMutation = useMutation({
    mutationFn: (input: ProductPayload) => upsertProductAdmin({ data: input }),
    onSuccess: () => {
      toast.success("Producto guardado");
      queryClient.invalidateQueries({ queryKey: ["admin-productos"] });
      setDialogOpen(false);
    },
    onError: (err) => toast.error("No se pudo guardar", { description: err.message }),
  });

  function openNew() {
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(p: ProductRow) {
    const isPreset = IMAGE_PRESETS.some((preset) => preset.value === p.image_url);
    setForm({
      id: p.id,
      categoryId: p.category_id,
      name: p.name,
      slug: p.slug,
      shortDescription: p.short_description,
      description: p.description,
      benefitsText: (p.benefits ?? []).join("\n"),
      imagePreset: isPreset && p.image_url ? p.image_url : DEFAULT_IMAGE,
      customImage: isPreset || !p.image_url ? "" : p.image_url,
      price: String(p.price),
      durationDays: String(p.duration_days),
      billingLabel: p.billing_label,
      isActive: p.is_active,
      isFeatured: p.is_featured,
      stock: p.stock === null || p.stock === undefined ? "" : String(p.stock),
    });
    setDialogOpen(true);
  }

  function buildPayload(f: ProductFormState) {
    return {
      id: f.id,
      categoryId: f.categoryId,
      name: f.name.trim(),
      slug: f.slug.trim() || slugify(f.name),
      shortDescription: f.shortDescription.trim(),
      description: f.description.trim(),
      benefits: f.benefitsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      imageUrl: f.customImage.trim() || f.imagePreset || null,
      price: Number(f.price),
      durationDays: Number.parseInt(f.durationDays, 10),
      billingLabel: f.billingLabel,
      isActive: f.isActive,
      isFeatured: f.isFeatured,
      stock: f.stock.trim() === "" ? null : Math.max(0, Number.parseInt(f.stock, 10) || 0),
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = productInputSchema.safeParse(buildPayload(form));
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Revisa el formulario");
      return;
    }
    saveMutation.mutate(parsed.data);
  }

  function quickToggle(p: ProductRow, field: "isActive" | "isFeatured", value: boolean) {
    saveMutation.mutate({
      id: p.id,
      categoryId: p.category_id,
      name: p.name,
      slug: p.slug,
      shortDescription: p.short_description,
      description: p.description,
      benefits: p.benefits ?? [],
      imageUrl: p.image_url,
      price: Number(p.price),
      durationDays: p.duration_days,
      billingLabel: p.billing_label,
      isActive: field === "isActive" ? value : p.is_active,
      isFeatured: field === "isFeatured" ? value : p.is_featured,
      stock: p.stock ?? null,
    });
  }

  if (!rolesLoading && !isAdmin) {
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <h1 className="font-display text-xl font-bold">Solo administradores</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          La gestión del catálogo está reservada al rol de administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Productos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Catálogo de servicios digitales visibles en la tienda.
          </p>
        </div>
        <Button onClick={openNew} className="font-semibold">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo producto
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      ) : (data?.products ?? []).length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
          Aún no hay productos. Crea el primero.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(data?.products ?? []).map((p) => (
            <div
              key={p.id}
              className={cn(
                "glass card-glow overflow-hidden rounded-2xl transition-opacity",
                !p.is_active && "opacity-55",
              )}
            >
              <div className="relative h-36 bg-secondary">
                {p.image_url && (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                )}
                <div className="absolute left-3 top-3 flex gap-1.5">
                  <Badge
                    variant="outline"
                    className={cn(
                      "backdrop-blur",
                      p.is_active ? TONE_CLASSES.success : TONE_CLASSES.neutral,
                    )}
                  >
                    {p.is_active ? "Activo" : "Oculto"}
                  </Badge>
                  {p.is_featured && (
                    <Badge variant="outline" className={cn("backdrop-blur", TONE_CLASSES.gold)}>
                      <Star className="mr-1 h-3 w-3 fill-current" />
                      Destacado
                    </Badge>
                  )}
                  {p.stock !== null && p.stock !== undefined && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "backdrop-blur",
                        p.stock <= 0 ? TONE_CLASSES.danger : TONE_CLASSES.info,
                      )}
                    >
                      {p.stock <= 0 ? "Agotado" : `${p.stock} en stock`}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-base font-bold">{p.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {fmtUSD(p.price)} · {p.billing_label} · {p.duration_days} días
                    </p>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => openEdit(p)} aria-label={`Editar ${p.name}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch
                      checked={p.is_active}
                      onCheckedChange={(v) => quickToggle(p, "isActive", v)}
                      disabled={saveMutation.isPending}
                    />
                    Visible
                  </label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch
                      checked={p.is_featured}
                      onCheckedChange={(v) => quickToggle(p, "isFeatured", v)}
                      disabled={saveMutation.isPending}
                    />
                    Destacado
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar producto" : "Nuevo producto"}</DialogTitle>
            <DialogDescription>
              Los cambios se reflejan en la tienda inmediatamente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="p-name">Nombre</Label>
                <Input
                  id="p-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      name: e.target.value,
                      slug: f.id ? f.slug : slugify(e.target.value),
                    }))
                  }
                  placeholder="Ej. StreamMax Premium"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-slug">Slug (URL)</Label>
                <Input
                  id="p-slug"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="streammax-premium"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select
                  value={form.categoryId ?? "none"}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, categoryId: v === "none" ? null : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin categoría</SelectItem>
                    {(data?.categories ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Facturación</Label>
                <Select
                  value={form.billingLabel}
                  onValueChange={(v) => setForm((f) => ({ ...f, billingLabel: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_OPTIONS.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b.charAt(0).toUpperCase() + b.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="p-price">Precio (USD)</Label>
                <Input
                  id="p-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="9.99"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-days">Duración (días)</Label>
                <Input
                  id="p-days"
                  type="number"
                  min="1"
                  step="1"
                  value={form.durationDays}
                  onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-stock">Inventario (stock)</Label>
              <Input
                id="p-stock"
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                placeholder="Vacío = ilimitado · 0 = agotado"
              />
              <p className="text-xs text-muted-foreground">
                Déjalo vacío para stock ilimitado. Pon <strong>0</strong> para marcar “Agotado”.
                Baja automáticamente 1 por cada compra pagada.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-short">Descripción corta</Label>
              <Input
                id="p-short"
                value={form.shortDescription}
                onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
                placeholder="Una línea para la tarjeta del catálogo"
                maxLength={200}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-desc">Descripción completa</Label>
              <Textarea
                id="p-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Detalles del servicio, condiciones, dispositivos soportados…"
                className="min-h-24"
                maxLength={3000}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-benefits">Beneficios (uno por línea)</Label>
              <Textarea
                id="p-benefits"
                value={form.benefitsText}
                onChange={(e) => setForm((f) => ({ ...f, benefitsText: e.target.value }))}
                placeholder={"Calidad 4K\nHasta 4 dispositivos\nSoporte prioritario"}
                className="min-h-20"
              />
            </div>

            <div className="space-y-2">
              <Label>Imagen</Label>
              <div className="grid grid-cols-4 gap-2">
                {IMAGE_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, imagePreset: preset.value, customImage: "" }))
                    }
                    className={cn(
                      "overflow-hidden rounded-lg border-2 transition-all",
                      form.imagePreset === preset.value && !form.customImage
                        ? "border-primary"
                        : "border-transparent opacity-60 hover:opacity-100",
                    )}
                    title={preset.label}
                  >
                    <img src={preset.value} alt={preset.label} className="h-14 w-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
              <Input
                value={form.customImage}
                onChange={(e) => setForm((f) => ({ ...f, customImage: e.target.value }))}
                placeholder="O pega una URL de imagen personalizada…"
                className="mt-2"
              />
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                />
                Visible en la tienda
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.isFeatured}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isFeatured: v }))}
                />
                Destacado
              </label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} className="font-semibold">
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {form.id ? "Guardar cambios" : "Crear producto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
