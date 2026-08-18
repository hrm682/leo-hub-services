import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  FileImage,
  Hourglass,
  LayoutGrid,
  Loader2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime, fmtUSD } from "@/lib/format";
import {
  BINANCE_PAY_CURRENCY,
  BINANCE_PAY_ID,
  BINANCE_PAY_NAME,
  MAX_RECEIPT_BYTES,
  PAYMENT_STEPS,
  RECEIPT_ACCEPT,
} from "@/lib/payment";
import { orderDetailQueryOptions } from "@/lib/queries";
import { attachReceipt } from "@/lib/shop.functions";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
} from "@/lib/status";
import { useSession } from "@/lib/use-session";
import { StatusBadge } from "@/components/status-badge";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/pago/$orderId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(orderDetailQueryOptions(params.orderId)),
  head: () => ({
    meta: [
      { title: "Pago de orden — Leo Hub" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentPage,
  errorComponent: PaymentError,
});

function PaymentError({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="font-display text-xl font-semibold">No pudimos cargar la orden</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          <Button className="mt-6" onClick={() => router.invalidate()}>
            Reintentar
          </Button>
        </div>
      </div>
    </div>
  );
}

function PaymentPage() {
  const { orderId } = Route.useParams();
  const { data } = useSuspenseQuery(orderDetailQueryOptions(orderId));
  const { data: user } = useSession();
  const queryClient = useQueryClient();
  const attachReceiptFn = useServerFn(attachReceipt);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [reference, setReference] = useState("");
  const [sending, setSending] = useState(false);

  async function copyBinanceId() {
    try {
      await navigator.clipboard.writeText(BINANCE_PAY_ID);
      toast.success("Binance ID copiado");
    } catch {
      toast.error("No se pudo copiar. Selecciónalo manualmente.");
    }
  }

  async function submitReceipt(e: React.FormEvent) {
    e.preventDefault();
    const order = data.order;
    if (!order || !user) return;
    if (!file) {
      toast.error("Selecciona la imagen o PDF de tu comprobante");
      return;
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      toast.error("El archivo supera el máximo de 8 MB");
      return;
    }

    setSending(true);
    try {
      const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const ext = rawExt.replace(/[^a-z0-9]/g, "") || "png";
      const path = `${user.id}/${order.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("comprobantes")
        .upload(path, file, file.type ? { contentType: file.type } : undefined);
      if (uploadError) throw new Error("No se pudo subir el archivo. Inténtalo de nuevo.");

      await attachReceiptFn({
        data: {
          orderId: order.id,
          receiptPath: path,
          transactionReference: reference.trim() || undefined,
        },
      });

      toast.success("Comprobante enviado", {
        description: "Te avisaremos en cuanto aprobemos tu pago.",
      });
      await queryClient.invalidateQueries({ queryKey: ["orden", orderId] });
      await queryClient.invalidateQueries({ queryKey: ["portal"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar el comprobante");
    } finally {
      setSending(false);
    }
  }

  const order = data.order;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <Link
          to="/portal"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Ir a Mis servicios
        </Link>

        {!order ? (
          <div className="mt-16 flex flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <XCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="mt-4 font-display text-lg font-semibold">Orden no encontrada</h1>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              No encontramos esta orden en tu cuenta. Revisa tus servicios o contáctanos.
            </p>
            <Button asChild className="mt-6">
              <Link to="/portal">Ir a Mis servicios</Link>
            </Button>
          </div>
        ) : (
          <PaymentContent
            order={order}
            file={file}
            reference={reference}
            sending={sending}
            fileInputRef={fileInputRef}
            onCopyId={copyBinanceId}
            onPickFile={(f) => setFile(f)}
            onReferenceChange={setReference}
            onSubmit={submitReceipt}
          />
        )}
      </main>
    </div>
  );
}

type OrderDetail = NonNullable<
  Awaited<ReturnType<typeof import("@/lib/shop.functions").getOrderDetail>>["order"]
>;

interface PaymentContentProps {
  order: OrderDetail;
  file: File | null;
  reference: string;
  sending: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onCopyId: () => void;
  onPickFile: (file: File | null) => void;
  onReferenceChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

function PaymentContent({
  order,
  file,
  reference,
  sending,
  fileInputRef,
  onCopyId,
  onPickFile,
  onReferenceChange,
  onSubmit,
}: PaymentContentProps) {
  const payment = order.payments?.[0] ?? null;
  const kindLabel = order.kind === "renovacion" ? "Renovación" : "Compra";

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">
            Orden {order.order_number}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {kindLabel} · creada el {fmtDateTime(order.created_at)}
          </p>
        </div>
        <StatusBadge tone={ORDER_STATUS_TONES[order.status] ?? "neutral"}>
          {ORDER_STATUS_LABELS[order.status] ?? order.status}
        </StatusBadge>
      </div>

      {payment?.status === "aprobado" && (
        <div className="glass card-glow rounded-2xl p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold">Pago aprobado</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Tu pago fue verificado y tus servicios están activos (o su vigencia fue extendida).
            ¡Gracias por tu confianza!
          </p>
          <Button asChild className="mt-6 font-semibold">
            <Link to="/portal">
              <LayoutGrid className="mr-2 h-4 w-4" />
              Ver Mis servicios
            </Link>
          </Button>
        </div>
      )}

      {payment?.status === "rechazado" && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold">Pago rechazado</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {payment.rejection_reason ||
              "No pudimos validar tu comprobante. Verifica el monto y vuelve a intentarlo."}
          </p>
          <p className="mx-auto mt-3 max-w-md text-xs text-muted-foreground">
            Si crees que es un error, contáctanos respondiendo tu notificación o creando una nueva
            orden desde el catálogo.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/catalogo">Volver al catálogo</Link>
          </Button>
        </div>
      )}

      {payment?.status === "pendiente" && payment.receipt_path && (
        <div className="glass card-glow rounded-2xl p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-info/15">
            <Hourglass className="h-8 w-8 text-info" />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold">Comprobante en revisión</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Recibimos tu comprobante y lo estamos verificando. Este proceso suele tomar poco
            tiempo; te notificaremos al aprobarse.
          </p>
          {payment.transaction_reference && (
            <p className="mt-3 text-xs text-muted-foreground">
              Referencia enviada: <span className="font-mono">{payment.transaction_reference}</span>
            </p>
          )}
        </div>
      )}

      {payment?.status === "pendiente" && !payment.receipt_path && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="glass card-glow rounded-2xl p-6">
            <h2 className="font-display text-lg font-bold">1. Paga con Binance Pay</h2>

            <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Binance ID de {BINANCE_PAY_NAME}
              </p>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <p className="font-mono text-lg font-bold tracking-wide text-primary">
                  {BINANCE_PAY_ID}
                </p>
                <Button variant="outline" size="sm" onClick={onCopyId}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copiar
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Monto exacto a enviar:</p>
              <p className="font-display text-2xl font-extrabold text-gold-gradient">
                {fmtUSD(Number(payment.amount))}{" "}
                <span className="text-sm font-semibold text-muted-foreground">
                  {BINANCE_PAY_CURRENCY}
                </span>
              </p>
            </div>

            <ol className="mt-5 space-y-2.5">
              {PAYMENT_STEPS.map((step, i) => (
                <li key={step} className="flex items-start gap-3 text-sm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="glass rounded-2xl p-6">
            <h2 className="font-display text-lg font-bold">2. Sube tu comprobante</h2>
            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="receipt">Captura del pago</Label>
                <input
                  ref={fileInputRef}
                  id="receipt"
                  type="file"
                  accept={RECEIPT_ACCEPT}
                  className="hidden"
                  onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/30 px-4 py-8 text-center transition-colors hover:border-primary/40 hover:bg-secondary/50"
                >
                  {file ? (
                    <>
                      <FileImage className="h-7 w-7 text-primary" />
                      <span className="max-w-full truncate text-sm font-semibold">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        Toca para cambiar el archivo
                      </span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-7 w-7 text-muted-foreground" />
                      <span className="text-sm font-semibold">Seleccionar archivo</span>
                      <span className="text-xs text-muted-foreground">
                        Imagen o PDF · máximo 8 MB
                      </span>
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Referencia de transacción (opcional)</Label>
                <Input
                  id="reference"
                  value={reference}
                  onChange={(e) => onReferenceChange(e.target.value)}
                  placeholder="ID de la transacción en Binance"
                  maxLength={120}
                />
              </div>

              <Button type="submit" className="w-full font-semibold" disabled={sending || !file}>
                {sending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="mr-2 h-4 w-4" />
                )}
                {sending ? "Enviando…" : "Enviar comprobante"}
              </Button>
            </form>
          </div>
        </div>
      )}

      {!payment && (
        <div className="rounded-2xl border border-border bg-secondary/30 p-6 text-center text-sm text-muted-foreground">
          No encontramos un pago asociado a esta orden.
        </div>
      )}

      <div className="glass rounded-2xl p-6">
        <h2 className="font-display text-lg font-bold">Detalle de la orden</h2>
        <ul className="mt-4 divide-y divide-border/60 text-sm">
          {order.order_items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div>
                <p className="font-semibold">{item.service_name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.quantity} × {fmtUSD(Number(item.unit_price))} · {item.duration_days} días
                </p>
              </div>
              <p className="font-semibold">{fmtUSD(Number(item.unit_price) * item.quantity)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{fmtUSD(Number(order.subtotal))}</dd>
          </div>
          {Number(order.discount) > 0 && (
            <div className="flex justify-between text-success">
              <dt>Descuento{order.coupon_code ? ` (${order.coupon_code})` : ""}</dt>
              <dd>−{fmtUSD(Number(order.discount))}</dd>
            </div>
          )}
          <div className="flex justify-between text-base">
            <dt className="font-semibold">Total</dt>
            <dd className="font-display font-extrabold text-gold-gradient">
              {fmtUSD(Number(order.total))}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
