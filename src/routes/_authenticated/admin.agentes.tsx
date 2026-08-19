import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  Headset,
  History,
  LifeBuoy,
  MessageSquarePlus,
  Search,
  UserCog,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  assignAgentToClient,
  getClientInteractionHistory,
  listClientAssignments,
  logAgentInteraction,
  unassignAgent,
} from "@/lib/agents.functions";
import { fmtDateTime } from "@/lib/format";
import { useIsStaff, useSession } from "@/lib/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/admin/agentes")({
  head: () => ({
    meta: [{ title: "Agentes — LoMaximoLeo Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AgentesPage,
});

const NONE = "__none__";
const KIND_LABEL: Record<string, string> = {
  asignacion: "Asignación",
  ticket: "Ticket",
  interaccion: "Interacción",
  servicio: "Servicio",
};
const KIND_TONE: Record<string, string> = {
  asignacion: "bg-primary/15 text-primary border-primary/30",
  ticket: "bg-info/15 text-info border-info/30",
  interaccion: "bg-success/15 text-success border-success/30",
  servicio: "bg-muted text-muted-foreground border-border",
};

function AgentesPage() {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const { isAdmin } = useIsStaff(user?.id);
  const [search, setSearch] = useState("");
  const [historyClient, setHistoryClient] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-agentes"],
    queryFn: () => listClientAssignments(),
  });

  const assignMutation = useMutation({
    mutationFn: (input: { clientId: string; agentId: string }) =>
      assignAgentToClient({ data: input }),
    onSuccess: () => {
      toast.success("Agente asignado");
      queryClient.invalidateQueries({ queryKey: ["admin-agentes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-agente-historial"] });
    },
    onError: (err) => toast.error("No se pudo asignar", { description: err.message }),
  });

  const unassignMutation = useMutation({
    mutationFn: (clientId: string) => unassignAgent({ data: { clientId } }),
    onSuccess: () => {
      toast.success("Agente removido");
      queryClient.invalidateQueries({ queryKey: ["admin-agentes"] });
    },
    onError: (err) => toast.error("No se pudo remover", { description: err.message }),
  });

  const term = search.trim().toLowerCase();
  const customers = (data?.customers ?? []).filter(
    (c) =>
      !term ||
      c.fullName.toLowerCase().includes(term) ||
      (c.agentName ?? "").toLowerCase().includes(term),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            <Headset className="h-6 w-6 text-primary" />
            Agentes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Asigna un agente de soporte principal a cada cliente y revisa el historial de
            interacción. {isAdmin ? "" : "Solo los administradores pueden reasignar."}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por cliente o agente…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Resumen de agentes */}
      {!isLoading && data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="glass rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Sin agente</p>
            <p className="mt-1 font-display text-2xl font-bold text-warning">{data.unassigned}</p>
          </div>
          {data.agents.map((a) => (
            <div key={a.id} className="glass rounded-xl p-4">
              <p className="truncate text-xs uppercase tracking-wider text-muted-foreground">
                {a.fullName}
                {a.isAdmin ? " · admin" : ""}
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-primary">{a.clients}</p>
              <p className="text-xs text-muted-foreground">clientes</p>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
          No se encontraron clientes.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Agente principal</th>
                <th className="px-4 py-3 font-medium">Servicios</th>
                <th className="px-4 py-3 font-medium">Tickets</th>
                <th className="px-4 py-3 text-right font-medium">Historial</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 font-display text-sm font-bold text-primary">
                        {c.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{c.fullName}</p>
                        {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin ? (
                      <Select
                        value={c.agentId ?? NONE}
                        onValueChange={(value) => {
                          if (value === NONE) unassignMutation.mutate(c.id);
                          else assignMutation.mutate({ clientId: c.id, agentId: value });
                        }}
                        disabled={assignMutation.isPending || unassignMutation.isPending}
                      >
                        <SelectTrigger className="w-56">
                          <SelectValue placeholder="Sin asignar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Sin asignar</SelectItem>
                          {(data?.agents ?? []).map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.fullName}
                              {a.isAdmin ? " · admin" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : c.agentName ? (
                      <span className="inline-flex items-center gap-1.5">
                        <UserCog className="h-3.5 w-3.5 text-primary" />
                        {c.agentName}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-success">{c.activeServices}</span>
                    <span className="text-muted-foreground"> activos</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <LifeBuoy className="h-3.5 w-3.5 text-muted-foreground" />
                      {c.openTickets} abiertos
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryClient({ id: c.id, name: c.fullName })}
                    >
                      <History className="mr-1.5 h-3.5 w-3.5" />
                      Ver historial
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <HistorySheet client={historyClient} onClose={() => setHistoryClient(null)} />
    </div>
  );
}

function HistorySheet({
  client,
  onClose,
}: {
  client: { id: string; name: string } | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<"nota" | "llamada" | "seguimiento">("nota");
  const [summary, setSummary] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-agente-historial", client?.id],
    queryFn: () => getClientInteractionHistory({ data: { clientId: client!.id } }),
    enabled: Boolean(client),
  });

  const logMutation = useMutation({
    mutationFn: () =>
      logAgentInteraction({ data: { clientId: client!.id, type, summary: summary.trim() } }),
    onSuccess: () => {
      toast.success("Interacción registrada");
      setSummary("");
      queryClient.invalidateQueries({ queryKey: ["admin-agente-historial", client?.id] });
    },
    onError: (err) => toast.error("No se pudo registrar", { description: err.message }),
  });

  return (
    <Sheet open={Boolean(client)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Historial de {client?.name}
          </SheetTitle>
          <SheetDescription>
            {data?.currentAgent
              ? `Agente actual: ${data.currentAgent.fullName}`
              : "Sin agente asignado"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <MessageSquarePlus className="h-4 w-4 text-primary" />
            Registrar interacción
          </p>
          <div className="mt-3 space-y-3">
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nota">Nota</SelectItem>
                <SelectItem value="llamada">Llamada</SelectItem>
                <SelectItem value="seguimiento">Seguimiento</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Resumen de la interacción…"
              rows={3}
              maxLength={500}
            />
            <Button
              className="w-full"
              disabled={summary.trim().length < 3 || logMutation.isPending}
              onClick={() => logMutation.mutate()}
            >
              Guardar interacción
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-3 pb-8">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : (data?.timeline ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aún no hay interacciones registradas.
            </p>
          ) : (
            (data?.timeline ?? []).map((item, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${KIND_TONE[item.kind] ?? KIND_TONE["servicio"]}`}
                  >
                    {KIND_LABEL[item.kind] ?? item.kind}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarClock className="h-3 w-3" />
                    {fmtDateTime(item.at)}
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-medium">{item.title}</p>
                {item.detail && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{item.detail}</p>
                )}
                {item.actor && <p className="mt-1 text-xs text-muted-foreground">— {item.actor}</p>}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
