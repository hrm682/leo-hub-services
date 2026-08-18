import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  CreditCard,
  LifeBuoy,
  PackageCheck,
  RefreshCcw,
  Star,
  TicketCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getAdminMetrics, getAdminReports } from "@/lib/admin.functions";
import { fmtDateTime, fmtUSD } from "@/lib/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES, TONE_CLASSES, type Tone } from "@/lib/status";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Reportes — LoMaximoLeo Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReportesPage,
});

const PIE_COLORS: Record<string, string> = {
  pendiente: "#E8B93E",
  pagada: "#4CC38A",
  rechazada: "#E5604C",
  cancelada: "#7A86A8",
};

const TOOLTIP_STYLE = {
  background: "oklch(0.195 0.028 262)",
  border: "1px solid oklch(0.33 0.03 262 / 0.55)",
  borderRadius: 12,
  color: "oklch(0.955 0.012 95)",
  fontSize: 13,
};

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="card-glow border-border/60 bg-card">
      <CardContent className="flex items-start gap-4 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 font-display text-2xl font-bold">{value}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function ReportesPage() {
  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: () => getAdminMetrics(),
  });
  const { data: reports, isLoading: loadingReports } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: () => getAdminReports(),
  });

  if (loadingMetrics || loadingReports) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!metrics || !reports) {
    return <p className="text-muted-foreground">No se pudieron cargar los reportes.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Reportes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pulso general del negocio en tiempo real.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={CreditCard} label="Ingresos aprobados" value={fmtUSD(metrics.ingresos)} />
        <KpiCard icon={Users} label="Clientes" value={String(metrics.clientes)} />
        <KpiCard
          icon={Clock}
          label="Pagos pendientes"
          value={String(metrics.pagosPendientes)}
          hint={metrics.pagosPendientes > 0 ? "Requieren revisión" : "Todo al día"}
        />
        <KpiCard
          icon={RefreshCcw}
          label="Vencen en 7 días"
          value={String(metrics.renovacionesProximas)}
          hint="Servicios por renovar"
        />
        <KpiCard
          icon={PackageCheck}
          label="Servicios activos"
          value={String(metrics.serviciosActivos)}
        />
        <KpiCard
          icon={LifeBuoy}
          label="Tickets abiertos"
          value={String(metrics.ticketsAbiertos)}
        />
        <KpiCard
          icon={TicketCheck}
          label="Tickets resueltos"
          value={String(metrics.ticketsResueltos)}
        />
        <KpiCard
          icon={Star}
          label="Satisfacción"
          value={reports.avgRating !== null ? `${reports.avgRating}/5` : "—"}
          hint="Calificación de tickets"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="card-glow border-border/60 bg-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-base">Ingresos por mes</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reports.revenueByMonth}>
                <XAxis
                  dataKey="label"
                  tick={{ fill: "oklch(0.685 0.028 262)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "oklch(0.685 0.028 262)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${v}`}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value: number) => [fmtUSD(value), "Ingresos"]}
                  cursor={{ fill: "oklch(1 0 0 / 0.04)" }}
                />
                <Bar dataKey="total" fill="#E7C15C" radius={[6, 6, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-glow border-border/60 bg-card">
          <CardHeader>
            <CardTitle className="font-display text-base">Órdenes por estado</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {reports.ordersByStatus.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Aún no hay órdenes.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reports.ordersByStatus}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {reports.ordersByStatus.map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={PIE_COLORS[entry.status] ?? "#7A86A8"}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: number, name: string) => [
                      value,
                      ORDER_STATUS_LABELS[name] ?? name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="card-glow border-border/60 bg-card">
          <CardHeader>
            <CardTitle className="font-display text-base">Productos más vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {reports.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin ventas registradas.</p>
            ) : (
              <ul className="space-y-3">
                {reports.topProducts.map((p, i) => (
                  <li key={p.name} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.unidades} unidades</p>
                    </div>
                    <span className="text-sm font-semibold text-primary">
                      {fmtUSD(p.ingresos)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="card-glow border-border/60 bg-card lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="font-display text-base">Últimas órdenes</CardTitle>
            <Link
              to="/admin/ordenes"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Ver todas
            </Link>
          </CardHeader>
          <CardContent>
            {metrics.ultimasOrdenes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay órdenes.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Orden</th>
                      <th className="pb-2 pr-4 font-medium">Fecha</th>
                      <th className="pb-2 pr-4 font-medium">Total</th>
                      <th className="pb-2 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.ultimasOrdenes.map((o) => (
                      <tr key={o.id} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 pr-4 font-mono text-xs">{o.order_number}</td>
                        <td className="py-2.5 pr-4 text-muted-foreground">
                          {fmtDateTime(o.created_at)}
                        </td>
                        <td className="py-2.5 pr-4 font-semibold">{fmtUSD(o.total)}</td>
                        <td className="py-2.5">
                          <Badge
                            variant="outline"
                            className={TONE_CLASSES[ORDER_STATUS_TONES[o.status] as Tone]}
                          >
                            {ORDER_STATUS_LABELS[o.status] ?? o.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
