import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { listNotificationsAdmin } from "@/lib/admin.functions";
import { fmtDateTime } from "@/lib/format";
import { TONE_CLASSES, type Tone } from "@/lib/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin/notificaciones")({
  head: () => ({
    meta: [
      { title: "Notificaciones — Leo Hub Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotificacionesAdminPage,
});

const TYPE_LABELS: Record<string, string> = {
  recordatorio_renovacion: "Recordatorio de renovación",
  pago: "Pagos",
  ticket: "Tickets",
};

const TYPE_TONES: Record<string, Tone> = {
  recordatorio_renovacion: "warning",
  pago: "gold",
  ticket: "info",
};

function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

function csvCell(value: string | null | undefined): string {
  return `"${(value ?? "").replaceAll('"', '""')}"`;
}

function NotificacionesAdminPage() {
  const [customerFilter, setCustomerFilter] = useState("todos");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todas");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-notificaciones"],
    queryFn: () => listNotificationsAdmin(),
  });

  const notifications = (data?.notifications ?? []).filter((n) => {
    if (customerFilter !== "todos" && n.user_id !== customerFilter) return false;
    if (typeFilter !== "todos" && n.type !== typeFilter) return false;
    if (statusFilter === "leidas" && !n.read_at) return false;
    if (statusFilter === "no_leidas" && n.read_at) return false;
    return true;
  });

  function exportCsv() {
    if (!notifications.length) return;
    const header = ["Fecha", "Cliente", "Tipo", "Título", "Contenido", "Estado", "Leída el"];
    const lines = notifications.map((n) =>
      [
        fmtDateTime(n.created_at),
        n.customerName,
        typeLabel(n.type),
        n.title,
        n.content,
        n.read_at ? "Leída" : "No leída",
        n.read_at ? fmtDateTime(n.read_at) : "",
      ]
        .map(csvCell)
        .join(","),
    );
    const csv = `﻿${header.map(csvCell).join(",")}\n${lines.join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notificaciones-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${notifications.length} notificaciones exportadas a CSV`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Notificaciones
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Avisos enviados a los clientes: pagos, tickets y recordatorios de renovación.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={exportCsv}
          disabled={isLoading || notifications.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="no_leidas">No leídas</TabsTrigger>
            <TabsTrigger value="leidas">Leídas</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los clientes</SelectItem>
            {(data?.customers ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            {(data?.types ?? []).map((t) => (
              <SelectItem key={t} value={t}>
                {typeLabel(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isLoading && (
          <span className="text-xs text-muted-foreground">
            {notifications.length} resultado{notifications.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
          No hay notificaciones con estos filtros.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Notificación</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((n) => (
                <tr key={n.id} className="border-b border-border/50 align-top last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {fmtDateTime(n.created_at)}
                  </td>
                  <td className="px-4 py-3 font-medium">{n.customerName}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={TONE_CLASSES[TYPE_TONES[n.type] ?? "neutral"]}
                    >
                      {typeLabel(n.type)}
                    </Badge>
                  </td>
                  <td className="max-w-md px-4 py-3">
                    <p className="font-medium">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {n.content}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {n.read_at ? (
                      <Badge variant="outline" className={TONE_CLASSES.neutral}>
                        Leída · {fmtDateTime(n.read_at)}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className={TONE_CLASSES.success}>
                        No leída
                      </Badge>
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
