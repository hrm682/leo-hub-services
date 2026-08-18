import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { listOrdersAdmin } from "@/lib/admin.functions";
import { fmtDateTime, fmtUSD } from "@/lib/format";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONES,
  TONE_CLASSES,
  type Tone,
} from "@/lib/status";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin/ordenes")({
  head: () => ({
    meta: [
      { title: "Órdenes — Leo Hub Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdenesPage,
});

function OrdenesPage() {
  const [statusFilter, setStatusFilter] = useState("todas");
  const [kindFilter, setKindFilter] = useState("todos");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-ordenes"],
    queryFn: () => listOrdersAdmin(),
  });

  const orders = (data?.orders ?? []).filter((o) => {
    if (statusFilter !== "todas" && o.status !== statusFilter) return false;
    if (kindFilter !== "todos" && o.kind !== kindFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Órdenes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Historial completo de compras y renovaciones.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="pendiente">Pendientes</TabsTrigger>
            <TabsTrigger value="pagada">Pagadas</TabsTrigger>
            <TabsTrigger value="rechazada">Rechazadas</TabsTrigger>
            <TabsTrigger value="cancelada">Canceladas</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={kindFilter} onValueChange={setKindFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            <SelectItem value="compra">Compras</SelectItem>
            <SelectItem value="renovacion">Renovaciones</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
          No hay órdenes con estos filtros.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Orden</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Servicios</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Pago</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-border/50 last:border-0 align-top">
                  <td className="px-4 py-3 font-mono text-xs">{o.order_number}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDateTime(o.created_at)}</td>
                  <td className="px-4 py-3 font-medium">{o.customerName}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={
                        o.kind === "renovacion" ? TONE_CLASSES.info : TONE_CLASSES.gold
                      }
                    >
                      {o.kind === "renovacion" ? "Renovación" : "Compra"}
                    </Badge>
                  </td>
                  <td className="max-w-56 px-4 py-3">
                    <ul className="space-y-0.5 text-xs text-muted-foreground">
                      {(o.order_items ?? []).slice(0, 3).map((item, i) => (
                        <li key={i} className="truncate">
                          {item.service_name}
                          {item.quantity > 1 ? ` ×${item.quantity}` : ""}
                        </li>
                      ))}
                      {(o.order_items ?? []).length > 3 && (
                        <li>+{(o.order_items ?? []).length - 3} más</li>
                      )}
                    </ul>
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {fmtUSD(o.total)}
                    {Number(o.discount) > 0 && (
                      <p className="text-xs font-normal text-success">
                        −{fmtUSD(o.discount)} {o.coupon_code ? `(${o.coupon_code})` : ""}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={TONE_CLASSES[ORDER_STATUS_TONES[o.status] as Tone]}
                    >
                      {ORDER_STATUS_LABELS[o.status] ?? o.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {o.payment ? (
                      <Badge
                        variant="outline"
                        className={TONE_CLASSES[PAYMENT_STATUS_TONES[o.payment.status] as Tone]}
                      >
                        {PAYMENT_STATUS_LABELS[o.payment.status] ?? o.payment.status}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
