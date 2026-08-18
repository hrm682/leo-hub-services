import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  ExternalLink,
  History,
  LifeBuoy,
  PackageSearch,
  ReceiptText,
} from "lucide-react";

import { daysRemaining, fmtDate, fmtDateTime, fmtUSD } from "@/lib/format";
import { serviceDetailQueryOptions } from "@/lib/queries";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONES,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_TONES,
  serviceDisplayStatus,
  serviceTone,
} from "@/lib/status";
import { RenewalButton } from "@/components/portal/RenewalButton";
import { ProductImage } from "@/components/site/ProductCard";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/portal/servicio/$id")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(serviceDetailQueryOptions(params.id)),
  head: () => ({
    meta: [
      { title: "Detalle del servicio — LoMaximoLeo" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ServiceDetailPage,
  errorComponent: ServiceDetailError,
});

function ServiceDetailError({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <div className="flex items-center justify-center py-24">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-semibold">No pudimos cargar el servicio</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <Button className="mt-6" onClick={() => router.invalidate()}>
          Reintentar
        </Button>
      </div>
    </div>
  );
}

const EVENT_LABELS: Record<string, string> = {
  compra: "Compra",
  renovacion: "Renovación",
  activacion: "Activación",
  pago: "Pago",
  soporte: "Soporte",
};

const KIND_LABELS: Record<string, string> = {
  compra: "Compra",
  renovacion: "Renovación",
};

function ServiceDetailPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(serviceDetailQueryOptions(id));

  if (!data.service) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
          <PackageSearch className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="mt-4 font-display text-lg font-semibold">Servicio no encontrado</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Este servicio no existe en tu cuenta o fue movido.
        </p>
        <Button asChild className="mt-6">
          <Link to="/portal">Volver a Mis servicios</Link>
        </Button>
      </div>
    );
  }

  const service = data.service;
  const product = service.product;
  const tone = serviceTone(service.status, service.expiration_date);
  const label = serviceDisplayStatus(service.status, service.expiration_date);
  const days = daysRemaining(service.expiration_date);
  const duration = product?.duration_days ?? 30;
  const progressPct =
    service.status === "activo" && days !== null
      ? Math.max(0, Math.min(100, (days / duration) * 100))
      : null;

  return (
    <div className="space-y-6">
      <Link
        to="/portal"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Mis servicios
      </Link>

      <section className="glass card-glow overflow-hidden rounded-2xl">
        <div className="grid md:grid-cols-[16rem_1fr]">
          <div className="h-44 md:h-full">
            <ProductImage src={product?.image_url} alt={product?.name ?? "Servicio"} />
          </div>
          <div className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-extrabold tracking-tight">
                  {product?.name ?? "Servicio"}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {service.service_reference}
                </p>
              </div>
              <StatusBadge tone={tone}>{label}</StatusBadge>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">Alta</dt>
                <dd className="mt-1 text-sm font-semibold">{fmtDate(service.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">Inicio</dt>
                <dd className="mt-1 text-sm font-semibold">{fmtDate(service.start_date)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                  Vencimiento
                </dt>
                <dd className="mt-1 text-sm font-semibold">{fmtDate(service.expiration_date)}</dd>
              </div>
            </dl>

            {service.status === "activo" && service.expiration_date && (
              <div className="mt-5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5 text-primary" />
                    Vigencia de {duration} días
                  </span>
                  {days !== null && (
                    <span
                      className={
                        days < 0
                          ? "font-semibold text-destructive"
                          : days <= 7
                            ? "font-semibold text-warning"
                            : "font-semibold text-success"
                      }
                    >
                      {days < 0 ? `Venció hace ${Math.abs(days)} días` : `${days} días restantes`}
                    </span>
                  )}
                </div>
                {progressPct !== null && (
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              {service.status === "activo" && product && (
                <RenewalButton
                  serviceId={service.id}
                  productName={product.name}
                  price={Number(product.price)}
                  durationDays={product.duration_days}
                />
              )}
              {product?.support_url && (
                <Button asChild variant="outline">
                  <a href={product.support_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 h-4 w-4" />
                    Ayuda del servicio
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {product && product.benefits.length > 0 && (
        <section className="glass rounded-2xl p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <BadgeCheck className="h-5 w-5 text-primary" />
            Lo que incluye
          </h2>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {product.benefits.map((benefit: string) => (
              <li key={benefit} className="flex items-start gap-2.5 text-sm">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass rounded-2xl p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <ReceiptText className="h-5 w-5 text-primary" />
            Pagos y órdenes
          </h2>
          {data.orderItems.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Aún no hay órdenes asociadas a este servicio.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.orderItems.map((item) => {
                const order = item.orders
                  ? Array.isArray(item.orders)
                    ? (item.orders[0] ?? null)
                    : item.orders
                  : null;
                const payment = order?.payments
                  ? Array.isArray(order.payments)
                    ? (order.payments[0] ?? null)
                    : order.payments
                  : null;
                return (
                  <li
                    key={item.id}
                    className="rounded-xl border border-border bg-secondary/30 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold">
                        {order?.order_number ?? "Orden"} ·{" "}
                        <span className="text-muted-foreground">
                          {KIND_LABELS[order?.kind ?? ""] ?? "Compra"}
                        </span>
                      </p>
                      <p className="font-display text-sm font-bold">
                        {fmtUSD(Number(item.unit_price) * 1)}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.service_name} · {item.duration_days} días ·{" "}
                      {fmtDate(order?.created_at)}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {order && (
                        <StatusBadge tone={ORDER_STATUS_TONES[order.status] ?? "neutral"}>
                          {ORDER_STATUS_LABELS[order.status] ?? order.status}
                        </StatusBadge>
                      )}
                      {payment && (
                        <StatusBadge tone={PAYMENT_STATUS_TONES[payment.status] ?? "neutral"}>
                          Pago: {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
                        </StatusBadge>
                      )}
                      {order && payment?.status === "pendiente" && !payment.receipt_path && (
                        <Button asChild size="sm" variant="outline" className="ml-auto">
                          <Link to="/pago/$orderId" params={{ orderId: order.id }}>
                            Subir comprobante
                          </Link>
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="glass rounded-2xl p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <History className="h-5 w-5 text-primary" />
            Actividad del servicio
          </h2>
          {data.events.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Sin actividad registrada.</p>
          ) : (
            <ol className="mt-4 space-y-0">
              {data.events.map((event, index) => (
                <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {index < data.events.length - 1 && (
                    <span className="absolute left-[5px] top-4 h-full w-px bg-border" aria-hidden />
                  )}
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm font-semibold">
                      {EVENT_LABELS[event.event_type] ?? event.event_type}
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {event.description}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                      {fmtDateTime(event.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="glass rounded-2xl p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <LifeBuoy className="h-5 w-5 text-primary" />
          Solicitudes de soporte
        </h2>
        {data.tickets.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No has abierto solicitudes sobre este servicio.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {data.tickets.map((ticket) => (
              <li
                key={ticket.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-secondary/30 p-4"
              >
                <div>
                  <p className="text-sm font-semibold">{ticket.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {ticket.ticket_number} · {fmtDate(ticket.created_at)}
                  </p>
                </div>
                <StatusBadge tone={TICKET_STATUS_TONES[ticket.status] ?? "neutral"}>
                  {TICKET_STATUS_LABELS[ticket.status] ?? ticket.status}
                </StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
