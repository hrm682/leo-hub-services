import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  PackageOpen,
  RefreshCcw,
  UploadCloud,
} from "lucide-react";

import { daysRemaining, fmtDate, fmtUSD } from "@/lib/format";
import { myServicesQueryOptions, portalSummaryQueryOptions } from "@/lib/queries";
import { getMyServices } from "@/lib/portal.functions";
import { serviceDisplayStatus, serviceTone } from "@/lib/status";
import { useSession } from "@/lib/use-session";
import { RenewalButton } from "@/components/portal/RenewalButton";
import { ProductImage } from "@/components/site/ProductCard";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/portal/")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(portalSummaryQueryOptions),
      context.queryClient.ensureQueryData(myServicesQueryOptions),
    ]),
  head: () => ({
    meta: [
      { title: "Mis servicios — Leo Hub" },
      { name: "description", content: "Gestiona tus servicios, vigencias y renovaciones." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PortalHomePage,
  errorComponent: PortalError,
});

function PortalError({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <div className="flex items-center justify-center py-24">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-semibold">No pudimos cargar tu portal</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <Button className="mt-6" onClick={() => router.invalidate()}>
          Reintentar
        </Button>
      </div>
    </div>
  );
}

function PortalHomePage() {
  const { data: summary } = useSuspenseQuery(portalSummaryQueryOptions);
  const { data: servicesData } = useSuspenseQuery(myServicesQueryOptions);
  const { data: user } = useSession();

  const firstName = (
    (user?.user_metadata?.["full_name"] as string | undefined) || ""
  ).split(" ")[0];

  const stats = [
    { label: "Activos", value: summary.activos, icon: CheckCircle2, tone: "text-success" },
    { label: "Por vencer", value: summary.porVencer, icon: Clock, tone: "text-warning" },
    { label: "Pago pendiente", value: summary.pagoPendiente, icon: CreditCard, tone: "text-info" },
    { label: "En renovación", value: summary.enRenovacion, icon: RefreshCcw, tone: "text-primary" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          Hola{firstName ? `, ${firstName}` : ""} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Este es el estado de tus servicios hoy.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </p>
              <stat.icon className={`h-4 w-4 ${stat.tone}`} />
            </div>
            <p className="mt-2 font-display text-3xl font-extrabold">{stat.value}</p>
          </div>
        ))}
      </section>

      {summary.proximosVencimientos.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div className="text-sm">
            <p className="font-semibold text-warning">Vencimientos próximos</p>
            <ul className="mt-1 space-y-0.5 text-muted-foreground">
              {summary.proximosVencimientos.map((item) => (
                <li key={item.id}>
                  {item.productName} — vence {fmtDate(item.expirationDate)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <section>
        <div className="flex items-end justify-between">
          <h2 className="font-display text-xl font-bold">Mis servicios</h2>
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
          >
            Añadir servicio
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {servicesData.services.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <PackageOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold">
              Aún no tienes servicios
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Explora el catálogo y activa tu primer servicio en minutos.
            </p>
            <Button asChild className="mt-6 font-semibold">
              <Link to="/catalogo">
                Explorar catálogo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {servicesData.services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

type MyService = Awaited<ReturnType<typeof getMyServices>>["services"][number];


function ServiceCard({ service }: { service: MyService }) {
  const product = service.product;
  const tone = serviceTone(service.status, service.expirationDate);
  const label = serviceDisplayStatus(service.status, service.expirationDate);
  const days = daysRemaining(service.expirationDate);
  const duration = product?.duration_days ?? 30;
  const progressPct =
    service.status === "activo" && days !== null
      ? Math.max(0, Math.min(100, (days / duration) * 100))
      : null;

  const price = product ? Number(product.price) : 0;
  const awaitingReceipt =
    service.status === "pago_pendiente" &&
    service.purchaseOrder?.paymentStatus === "pendiente" &&
    !service.purchaseOrder.hasReceipt;
  const receiptInReview =
    service.status === "pago_pendiente" && service.purchaseOrder?.hasReceipt;

  return (
    <article className="glass card-glow flex flex-col overflow-hidden rounded-2xl">
      <div className="relative h-32">
        <ProductImage src={product?.image_url} alt={product?.name ?? "Servicio"} />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
        <div className="absolute right-3 top-3">
          <StatusBadge tone={tone}>{label}</StatusBadge>
        </div>
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="truncate font-display text-base font-bold">{product?.name ?? "Servicio"}</h3>
          <p className="text-xs text-muted-foreground">{service.serviceReference}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        {service.status === "activo" && service.expirationDate && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Vence {fmtDate(service.expirationDate)}</span>
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

        {service.status === "pago_pendiente" && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {receiptInReview
              ? "Recibimos tu comprobante. Lo estamos verificando."
              : "Completa el pago para activar este servicio."}
          </p>
        )}
        {service.status === "en_renovacion" && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Tu renovación está en proceso. Al aprobarse el pago se extiende tu vigencia.
          </p>
        )}
        {service.status === "suspendido" && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Este servicio está suspendido. Contáctanos si crees que es un error.
          </p>
        )}
        {service.status === "finalizado" && service.expirationDate && (
          <p className="text-xs text-muted-foreground">
            Finalizó el {fmtDate(service.expirationDate)}
          </p>
        )}

        <div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-4">
          {service.status === "activo" && product && (
            <RenewalButton
              serviceId={service.id}
              productName={product.name}
              price={price}
              durationDays={product.duration_days}
              className="flex-1 font-semibold"
            />
          )}
          {awaitingReceipt && service.purchaseOrder && (
            <Button asChild className="flex-1 font-semibold">
              <Link to="/pago/$orderId" params={{ orderId: service.purchaseOrder.id }}>
                <UploadCloud className="mr-1.5 h-4 w-4" />
                Subir comprobante
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" className={service.status === "activo" || awaitingReceipt ? "" : "flex-1"}>
            <Link to="/portal/servicio/$id" params={{ id: service.id }}>
              Detalle
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
