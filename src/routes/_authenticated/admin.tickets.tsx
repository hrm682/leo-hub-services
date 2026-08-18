import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Lock, Send, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  listTicketsAdmin,
  replyTicketAdmin,
  setTicketStatusAdmin,
} from "@/lib/admin.functions";
import { getTicketDetail } from "@/lib/portal.functions";
import { fmtDateTime } from "@/lib/format";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_TONES,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_TONES,
  TONE_CLASSES,
  type Tone,
} from "@/lib/status";
import { useSession } from "@/lib/use-session";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/admin/tickets")({
  head: () => ({
    meta: [
      { title: "Tickets — Leo Hub Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TicketsPage,
});

const STATUS_OPTIONS = ["abierto", "en_revision", "en_espera", "en_proceso", "resuelto", "cerrado"];

function TicketsPage() {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const [statusFilter, setStatusFilter] = useState("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: () => listTicketsAdmin(),
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["admin-ticket", selectedId],
    enabled: Boolean(selectedId),
    queryFn: () => getTicketDetail({ data: { ticketId: selectedId! } }),
  });

  const replyMutation = useMutation({
    mutationFn: (input: { ticketId: string; message: string; isInternalNote: boolean }) =>
      replyTicketAdmin({ data: input }),
    onSuccess: () => {
      setReply("");
      setIsInternalNote(false);
      queryClient.invalidateQueries({ queryKey: ["admin-ticket", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
    },
    onError: (err) => toast.error("No se pudo enviar", { description: err.message }),
  });

  const statusMutation = useMutation({
    mutationFn: (input: { ticketId: string; status: string }) =>
      setTicketStatusAdmin({
        data: { ticketId: input.ticketId, status: input.status as never },
      }),
    onSuccess: () => {
      toast.success("Estado actualizado");
      queryClient.invalidateQueries({ queryKey: ["admin-ticket", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
    },
    onError: (err) => toast.error("No se pudo actualizar", { description: err.message }),
  });

  const tickets = (listData?.tickets ?? []).filter(
    (t) => statusFilter === "todos" || t.status === statusFilter,
  );
  const selectedRow = listData?.tickets.find((t) => t.id === selectedId);
  const ticket = detail?.ticket ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Tickets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bandeja de soporte. Responde, cambia estados y deja notas internas.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <div className={cn("space-y-3", selectedId && "hidden lg:block")}>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {TICKET_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {listLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center text-sm text-muted-foreground">
              No hay tickets en este estado.
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto lg:max-h-[calc(100vh-16rem)]">
              {tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={cn(
                    "w-full rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40",
                    selectedId === t.id && "border-primary/60 bg-primary/5",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {t.ticket_number}
                    </span>
                    <Badge
                      variant="outline"
                      className={TONE_CLASSES[TICKET_STATUS_TONES[t.status] as Tone]}
                    >
                      {TICKET_STATUS_LABELS[t.status] ?? t.status}
                    </Badge>
                  </div>
                  <p className="mt-1.5 line-clamp-1 text-sm font-semibold">{t.subject}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.customerName} · {t.productName ?? "Servicio"} · {fmtDateTime(t.created_at)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={cn(!selectedId && "hidden lg:flex")}>
          {!selectedId ? (
            <div className="glass flex w-full items-center justify-center rounded-2xl p-16 text-sm text-muted-foreground">
              Selecciona un ticket para ver la conversación.
            </div>
          ) : detailLoading || !ticket ? (
            <div className="w-full space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <div className="w-full space-y-4">
              <div className="glass card-glow rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden"
                      onClick={() => setSelectedId(null)}
                      aria-label="Volver"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">
                        {ticket.ticket_number}
                      </p>
                      <h2 className="mt-0.5 font-display text-lg font-bold">{ticket.subject}</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selectedRow?.customerName ?? "Cliente"} · {ticket.productName ?? "—"} (
                        {ticket.serviceReference ?? "—"}) ·{" "}
                        {TICKET_CATEGORY_LABELS[ticket.category] ?? ticket.category}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={TONE_CLASSES[TICKET_PRIORITY_TONES[ticket.priority] as Tone]}
                    >
                      {TICKET_PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
                    </Badge>
                    <Select
                      value={ticket.status}
                      onValueChange={(v) =>
                        statusMutation.mutate({ ticketId: ticket.id, status: v })
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {TICKET_STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {ticket.rating && (
                  <p className="mt-3 flex items-center gap-1 text-xs text-warning">
                    {Array.from({ length: ticket.rating }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                    <span className="ml-1 text-muted-foreground">
                      Calificación del cliente
                    </span>
                  </p>
                )}
              </div>

              <div className="glass rounded-2xl p-5">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                      {(selectedRow?.customerName ?? "C").charAt(0).toUpperCase()}
                    </div>
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-secondary/70 px-4 py-3">
                      <p className="text-xs font-semibold text-muted-foreground">
                        {selectedRow?.customerName ?? "Cliente"} · {fmtDateTime(ticket.created_at)}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{ticket.description}</p>
                    </div>
                  </div>

                  {(detail?.messages ?? []).map((m) => {
                    const isMe = m.sender_id === user?.id;
                    const isCustomer = m.sender_id === ticket.user_id;
                    return (
                      <div
                        key={m.id}
                        className={cn("flex gap-3", isMe && "flex-row-reverse")}
                      >
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                            isCustomer ? "bg-secondary" : "bg-primary/20 text-primary",
                          )}
                        >
                          {isCustomer
                            ? (selectedRow?.customerName ?? "C").charAt(0).toUpperCase()
                            : "LH"}
                        </div>
                        <div
                          className={cn(
                            "max-w-[85%] rounded-2xl px-4 py-3",
                            m.is_internal_note
                              ? "border border-warning/40 bg-warning/10"
                              : isCustomer
                                ? "rounded-tl-sm bg-secondary/70"
                                : "rounded-tr-sm bg-primary/12",
                          )}
                        >
                          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            {m.is_internal_note && <Lock className="h-3 w-3 text-warning" />}
                            {m.is_internal_note
                              ? "Nota interna"
                              : isCustomer
                                ? (selectedRow?.customerName ?? "Cliente")
                                : isMe
                                  ? "Tú (Equipo Leo Hub)"
                                  : "Equipo Leo Hub"}
                            · {fmtDateTime(m.created_at)}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm">{m.message}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 border-t border-border pt-4">
                  <Textarea
                    placeholder={
                      isInternalNote
                        ? "Nota interna (solo visible para el equipo)…"
                        : "Escribe una respuesta para el cliente…"
                    }
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    maxLength={2000}
                    className="min-h-24"
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                      <Checkbox
                        checked={isInternalNote}
                        onCheckedChange={(v) => setIsInternalNote(v === true)}
                      />
                      Nota interna (no la ve el cliente)
                    </label>
                    <Button
                      disabled={reply.trim().length === 0 || replyMutation.isPending}
                      onClick={() =>
                        replyMutation.mutate({
                          ticketId: ticket.id,
                          message: reply.trim(),
                          isInternalNote,
                        })
                      }
                    >
                      {replyMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      {isInternalNote ? "Guardar nota" : "Responder"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
