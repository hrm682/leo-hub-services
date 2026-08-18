import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Loader2, ShieldCheck, ShoppingCart, Tag, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useCart } from "@/lib/cart";
import { fmtUSD } from "@/lib/format";
import { BINANCE_PAY_CURRENCY } from "@/lib/payment";
import { createOrder, validateCoupon } from "@/lib/shop.functions";
import { ProductImage } from "@/components/site/ProductCard";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Confirmar pedido — LoMaximoLeo" },
      { name: "description", content: "Confirma tu pedido y paga con Binance Pay." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

interface AppliedCoupon {
  code: string;
  description: string | null;
  discountPercent: number;
}

function CheckoutPage() {
  const { items, hydrated, subtotal, clear } = useCart();
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [creating, setCreating] = useState(false);
  const validateCouponFn = useServerFn(validateCoupon);
  const createOrderFn = useServerFn(createOrder);
  const navigate = useNavigate();

  const discount = coupon
    ? Math.round(subtotal * (coupon.discountPercent / 100) * 100) / 100
    : 0;
  const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setCheckingCoupon(true);
    try {
      const result = await validateCouponFn({ data: { code } });
      if (!result.valid) {
        toast.error("Cupón no válido o vencido");
        return;
      }
      setCoupon({
        code: result.code,
        description: result.description,
        discountPercent: result.discountPercent,
      });
      toast.success(`Cupón ${result.code} aplicado`, {
        description: `${result.discountPercent}% de descuento`,
      });
    } catch {
      toast.error("No pudimos validar el cupón. Inténtalo de nuevo.");
    } finally {
      setCheckingCoupon(false);
    }
  }

  async function confirmOrder() {
    if (items.length === 0 || creating) return;
    setCreating(true);
    try {
      const result = await createOrderFn({
        data: {
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          couponCode: coupon?.code,
        },
      });
      clear();
      toast.success("Orden creada", {
        description: `Tu orden ${result.orderNumber} está lista para pagar.`,
      });
      navigate({ to: "/pago/$orderId", params: { orderId: result.orderId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear la orden");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Link
          to="/carrito"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al carrito
        </Link>

        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight">
          Confirmar <span className="text-gold-gradient">pedido</span>
        </h1>

        {!hydrated ? (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
            <Skeleton className="h-72 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : items.length === 0 ? (
          <div className="mt-16 flex flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mt-4 font-display text-lg font-semibold">No hay nada que confirmar</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Tu carrito está vacío. Añade servicios desde el catálogo para continuar.
            </p>
            <Button asChild className="mt-6 font-semibold">
              <Link to="/catalogo">
                Ir al catálogo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
            <section className="space-y-6">
              <div className="glass rounded-2xl p-5 sm:p-6">
                <h2 className="font-display text-lg font-bold">Tu pedido</h2>
                <ul className="mt-4 divide-y divide-border/60">
                  {items.map((item) => (
                    <li key={item.productId} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg">
                        <ProductImage src={item.imageUrl} alt={item.name} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} × {fmtUSD(item.price)} · {item.durationDays} días c/u
                        </p>
                      </div>
                      <p className="font-display text-sm font-bold">
                        {fmtUSD(item.price * item.quantity)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="glass rounded-2xl p-5 sm:p-6">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                  <Tag className="h-4 w-4 text-primary" />
                  ¿Tienes un cupón?
                </h2>
                {coupon ? (
                  <div className="mt-4 flex items-center justify-between rounded-xl border border-success/30 bg-success/10 px-4 py-3">
                    <div className="text-sm">
                      <p className="font-semibold text-success">{coupon.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {coupon.description || `${coupon.discountPercent}% de descuento`}
                      </p>
                    </div>
                    <button
                      aria-label="Quitar cupón"
                      onClick={() => {
                        setCoupon(null);
                        setCouponInput("");
                      }}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 flex gap-2">
                    <Input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Código de cupón"
                      className="uppercase"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          applyCoupon();
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={applyCoupon}
                      disabled={checkingCoupon || !couponInput.trim()}
                    >
                      {checkingCoupon && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Aplicar
                    </Button>
                  </div>
                )}
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
                  {discount > 0 && (
                    <div className="flex justify-between text-success">
                      <dt>Descuento ({coupon?.code})</dt>
                      <dd className="font-semibold">−{fmtUSD(discount)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border pt-2.5">
                    <dt className="font-semibold">Total a pagar</dt>
                    <dd className="font-display text-xl font-extrabold text-gold-gradient">
                      {fmtUSD(total)}
                    </dd>
                  </div>
                </dl>

                <Button
                  size="lg"
                  className="mt-6 w-full font-semibold"
                  onClick={confirmOrder}
                  disabled={creating}
                >
                  {creating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  {creating ? "Creando orden…" : "Confirmar y pagar"}
                </Button>

                <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Al confirmar te mostraremos el Binance ID para enviar {fmtUSD(total)} en{" "}
                  {BINANCE_PAY_CURRENCY} y subir tu comprobante.
                </p>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
