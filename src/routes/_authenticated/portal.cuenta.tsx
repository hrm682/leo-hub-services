import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  LifeBuoy,
  Loader2,
  MessageSquarePlus,
  Paperclip,
  Send,
  Star,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { getFileSignedUrl } from "@/lib/admin.functions";
import { fmtDate, fmtDateTime } from "@/lib/format";
import {
  myProfileQueryOptions,
  myServicesQueryOptions,
  myTicketsQueryOptions,
  ticketDetailQueryOptions,
} from "@/lib/queries";
import {
  addTicketMessage,
  createTicket,
  rateTicket,
  updateMyProfile,
  type getMyServices,
  type getMyTickets,
} from "@/lib/portal.functions";
import { createTicketSchema, updateProfileSchema } from "@/lib/schemas";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_TONES,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_TONES,
} from "@/lib/status";
import { useSession } from "@/lib/use-session";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/portal/cuenta")({
  validateSearch: (search: Record<string, unknown>): { tab?: "perfil" | "soporte" } => ({
    tab: search.tab === "soporte" ? "soporte" : "perfil",
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(myProfileQueryOptions),
      context.queryClient.ensureQueryData(myTicketsQueryOptions),
      context.queryClient.ensureQueryData(myServicesQueryOptions),
    ]),
  head: () => ({
    meta: [
      { title: "Mi cuenta — Leo Hub" },
      {
        name: "description",
        content: "Actualiza tus datos personales y gestiona tus solicitudes de ayuda.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
  errorComponent: AccountError,
});

function AccountError({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <div className="flex items-center justify-center py-24">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-semibold">No pudimos cargar tu cuenta</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <Button className="mt-6" onClick={() => router.invalidate()}>
          Reintentar
        </Button>
      </div>
    </div>
  );
}

function AccountPage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          Mi cuenta
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Actualiza tus datos personales y gestiona tus solicitudes de ayuda.
        </p>
      </div>

      <Tabs
        value={tab ?? "perfil"}
        onValueChange={(value) =>
          navigate({
            to: "/portal/cuenta",
            search: { tab: value === "soporte" ? "soporte" : "perfil" },
            replace: true,
          })
        }
      >
        <TabsList>
          <TabsTrigger value="perfil">
            <UserRound className="mr-1.5 h-4 w-4" />
            Datos personales
          </TabsTrigger>
          <TabsTrigger value="soporte">
            <LifeBuoy className="mr-1.5 h-4 w-4" />
            Ayuda y soporte
          </TabsTrigger>
        </TabsList>
        <TabsContent value="perfil" className="mt-6">
          <ProfileSection />
        </TabsContent>
        <TabsContent value="soporte" className="mt-6">
          <SupportSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== Datos personales ====================

const NOTIF_OPTIONS = [
  {
    key: "email",
    label: "Correo electrónico",
    description: "Avisos de pagos, vencimientos y respuestas de soporte.",
  },
  {
    key: "in_app",
    label: "Notificaciones en la app",
    description: "Alertas dentro del portal.",
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    description: "Mensajes importantes a tu número registrado.",
  },
  {
    key: "push",
    label: "Notificaciones push",
    description: "Avisos instantáneos en tu dispositivo.",
  },
] as const;

type NotifKey = (typeof NOTIF_OPTIONS)[number]["key"];

function ProfileSection() {
  const { data } = useSuspenseQuery(myProfileQueryOptions);
  const { data: user } = useSession();
  const queryClient = useQueryClient();
  const updateProfile = useServerFn(updateMyProfile);

  const profile = data.profile;
  const prefs = (profile?.notification_prefs ?? {}) as Partial<Record<NotifKey, boolean>>;

  const [fullName, setFullName] = useState(
    profile?.full_name || (user?.user_metadata?.["full_name"] as string | undefined) || "",
  );
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [documentNumber, setDocumentNumber] = useState(profile?.document_number ?? "");
  const [notifPrefs, setNotifPrefs] = useState<Record<NotifKey, boolean>>({
    email: prefs.email ?? true,
    in_app: prefs.in_app ?? true,
    whatsapp: prefs.whatsapp ?? false,
    push: prefs.push ?? false,
  });

  const mutation = useMutation({
    mutationFn: (input: z.infer<typeof updateProfileSchema>) =>
      updateProfile({ data: input }),
    onSuccess: async () => {
      toast.success("Datos actualizados", {
        description: "Tu información se guardó correctamente.",
      });
      await queryClient.invalidateQueries({ queryKey: ["portal"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar tu perfil");
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = updateProfileSchema.safeParse({
      fullName,
      phone,
      documentNumber,
      notificationPrefs: notifPrefs,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Revisa los campos");
      return;
    }
    mutation.mutate(parsed.data);
  }

  return (
    <section className="grid gap-5 lg:grid-cols-3">
      <form onSubmit={handleSubmit} className="glass space-y-5 rounded-2xl p-5 sm:p-6 lg:col-span-2">
        <div>
          <h2 className="font-display text-lg font-bold">Datos personales</h2>
          <p className="text-sm text-muted-foreground">
            Esta información se usa en tus comprobantes y en la atención de soporte.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="fullName">Nombre completo</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={100}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono / WhatsApp</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+593 99 999 9999"
              maxLength={20}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="documentNumber">Documento de identidad</Label>
            <Input
              id="documentNumber"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              placeholder="Opcional"
              maxLength={30}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" value={user?.email ?? ""} disabled />
            <p className="text-xs text-muted-foreground">
              El correo es tu identificador de acceso y no se puede cambiar desde aquí.
            </p>
          </div>
        </div>

        <div className="flex justify-end border-t border-border/60 pt-4">
          <Button type="submit" disabled={mutation.isPending} className="font-semibold">
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar cambios
          </Button>
        </div>
      </form>

      <div className="space-y-5">
        <div className="glass rounded-2xl p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold">Notificaciones</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Elige cómo quieres enterarte de pagos, vencimientos y respuestas.
          </p>
          <div className="mt-4 space-y-4">
            {NOTIF_OPTIONS.map((opt) => (
              <div key={opt.key} className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </div>
                <Switch
                  checked={notifPrefs[opt.key]}
                  onCheckedChange={(checked) =>
                    setNotifPrefs((prev) => ({ ...prev, [opt.key]: checked }))
                  }
                  aria-label={opt.label}
                />
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Se guardan junto con tus datos personales.
          </p>
        </div>

        <div className="glass rounded-2xl p-5 text-sm">
          <p className="text-muted-foreground">Miembro desde</p>
          <p className="mt-1 font-display font-semibold">
            {fmtDate(profile?.created_at ?? user?.created_at)}
          </p>
        </div>
      </div>
    </section>
  );
}

// ==================== Ayuda y soporte ====================

type TicketRow = Awaited<ReturnType<typeof getMyTickets>>["tickets"][number];
type MyService = Awaited<ReturnType<typeof getMyServices>>["services"][number];

function SupportSection() {
  const { data } = useSuspenseQuery(myTicketsQueryOptions);
  const { data: servicesData } = useSuspenseQuery(myServicesQueryOptions);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const eligibleServices = servicesData.services.filter((s) =>
    ["activo", "en_renovacion"].includes(s.status),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">Mis solicitudes</h2>
          <p className="text-sm text-muted-foreground">
            Revisa el estado de tus tickets y conversa con nuestro equipo.
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          disabled={eligibleServices.length === 0}
          className="font-semibold"
        >
          <MessageSquarePlus className="mr-1.5 h-4 w-4" />
          Nueva solicitud
        </Button>
      </div>

      {data.tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <LifeBuoy className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold">Sin solicitudes todavía</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Si tienes un problema con algún servicio, crea tu primera solicitud y te ayudaremos.
          </p>
          {eligibleServices.length > 0 && (
            <Button onClick={() => setCreateOpen(true)} className="mt-6 font-semibold">
              <MessageSquarePlus className="mr-1.5 h-4 w-4" />
              Nueva solicitud
            </Button>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {data.tickets.map((ticket) => (
            <li key={ticket.id}>
              <button
                type="button"
                onClick={() => setSelectedTicketId(ticket.id)}
                className="glass w-full rounded-2xl p-4 text-left transition-colors hover:border-primary/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {ticket.ticket_number} ·{" "}
                      {TICKET_CATEGORY_LABELS[ticket.category] ?? ticket.category}
                    </p>
                    <p className="mt-1 truncate font-semibold">{ticket.subject}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {ticket.productName ?? ticket.serviceReference ?? "General"} ·{" "}
                      {fmtDateTime(ticket.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge tone={TICKET_PRIORITY_TONES[ticket.priority] ?? "neutral"}>
                      {TICKET_PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
                    </StatusBadge>
                    <StatusBadge tone={TICKET_STATUS_TONES[ticket.status] ?? "neutral"}>
                      {TICKET_STATUS_LABELS[ticket.status] ?? ticket.status}
                    </StatusBadge>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {eligibleServices.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Necesitas al menos un servicio activo para abrir una solicitud de soporte.
        </p>
      )}

      <CreateTicketDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        services={eligibleServices}
      />
      <TicketDetailDialog
        ticketId={selectedTicketId}
        onClose={() => setSelectedTicketId(null)}
      />
    </div>
  );
}

function CreateTicketDialog({
  open,
  onOpenChange,
  services,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: MyService[];
}) {
  const queryClient = useQueryClient();
  const submitTicket = useServerFn(createTicket);
  const [serviceId, setServiceId] = useState("");
  const [category, setCategory] = useState<string>("consulta");
  const [priority, setPriority] = useState<string>("media");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: (input: z.infer<typeof createTicketSchema>) => submitTicket({ data: input }),
    onSuccess: async (result) => {
      toast.success("Solicitud enviada", {
        description: `Tu ticket ${result.ticketNumber} fue registrado. Te avisaremos cuando haya novedades.`,
      });
      await queryClient.invalidateQueries({ queryKey: ["portal"] });
      onOpenChange(false);
      setServiceId("");
      setCategory("consulta");
      setPriority("media");
      setSubject("");
      setDescription("");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar la solicitud");
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = createTicketSchema.safeParse({
      customerServiceId: serviceId,
      category,
      priority,
      subject,
      description,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Revisa los campos");
      return;
    }
    mutation.mutate(parsed.data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva solicitud de ayuda</DialogTitle>
          <DialogDescription>
            Cuéntanos qué necesitas. Nuestro equipo te responderá lo antes posible.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ticket-service">Servicio</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger id="ticket-service">
                <SelectValue placeholder="Selecciona el servicio afectado" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.product?.name ?? "Servicio"} · {s.serviceReference}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ticket-category">Categoría</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="ticket-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TICKET_CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticket-priority">Prioridad</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="ticket-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-subject">Tema</Label>
            <Input
              id="ticket-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ej. No puedo acceder a mi cuenta"
              maxLength={140}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket-description">Detalles</Label>
            <Textarea
              id="ticket-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Describe lo que sucede, desde cuándo y qué has intentado…"
              maxLength={2000}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="font-semibold">
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar solicitud
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TicketDetailDialog({
  ticketId,
  onClose,
}: {
  ticketId: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const sendMessage = useServerFn(addTicketMessage);
  const submitRating = useServerFn(rateTicket);
  const [reply, setReply] = useState("");
  const [lastId, setLastId] = useState<string | null>(ticketId);
  if (ticketId && ticketId !== lastId) setLastId(ticketId);

  const { data, isLoading } = useQuery({
    ...ticketDetailQueryOptions(lastId ?? ""),
    enabled: Boolean(lastId),
  });

  const replyMutation = useMutation({
    mutationFn: (message: string) => sendMessage({ data: { ticketId: lastId!, message } }),
    onSuccess: async () => {
      setReply("");
      await queryClient.invalidateQueries({ queryKey: ["portal"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar el mensaje");
    },
  });

  const ratingMutation = useMutation({
    mutationFn: (rating: number) => submitRating({ data: { ticketId: lastId!, rating } }),
    onSuccess: async () => {
      toast.success("¡Gracias por tu calificación!");
      await queryClient.invalidateQueries({ queryKey: ["portal"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar");
    },
  });

  function handleReply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const message = reply.trim();
    if (!message) return;
    replyMutation.mutate(message);
  }

  const ticket = data?.ticket;
  const messages = data?.messages ?? [];

  return (
    <Dialog open={Boolean(ticketId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {isLoading || !ticket ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={TICKET_STATUS_TONES[ticket.status] ?? "neutral"}>
                  {TICKET_STATUS_LABELS[ticket.status] ?? ticket.status}
                </StatusBadge>
                <StatusBadge tone={TICKET_PRIORITY_TONES[ticket.priority] ?? "neutral"}>
                  Prioridad {TICKET_PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
                </StatusBadge>
              </div>
              <DialogTitle className="mt-2">{ticket.subject}</DialogTitle>
              <DialogDescription>
                {ticket.ticket_number} · {TICKET_CATEGORY_LABELS[ticket.category] ?? ticket.category}{" "}
                · {ticket.productName ?? "General"} · abierto {fmtDateTime(ticket.created_at)}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-border/60 bg-secondary/30 p-4 text-sm leading-relaxed text-muted-foreground">
              {ticket.description}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Conversación</h3>
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no hay respuestas. Te notificaremos cuando el equipo conteste.
                </p>
              ) : (
                messages.map((m) => {
                  const own = m.sender_id === ticket.user_id;
                  return (
                    <div key={m.id} className={cn("flex", own ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                          own
                            ? "bg-primary text-primary-foreground"
                            : "border border-border bg-muted/50",
                        )}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>
                        {m.attachment_path && <AttachmentLink path={m.attachment_path} own={own} />}
                        <p
                          className={cn(
                            "mt-1 text-[10px]",
                            own ? "text-primary-foreground/70" : "text-muted-foreground",
                          )}
                        >
                          {own ? "Tú" : "Equipo Leo Hub"} · {fmtDateTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {ticket.status === "resuelto" && !ticket.rating && (
              <RatingPanel
                pending={ratingMutation.isPending}
                onRate={(rating) => ratingMutation.mutate(rating)}
              />
            )}
            {ticket.rating != null && (
              <div className="flex items-center justify-center gap-1 rounded-xl border border-border/60 py-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={cn(
                      "h-4 w-4",
                      n <= (ticket.rating ?? 0)
                        ? "fill-primary text-primary"
                        : "text-muted-foreground/40",
                    )}
                  />
                ))}
                <span className="ml-2 text-xs text-muted-foreground">
                  Gracias por tu calificación
                </span>
              </div>
            )}

            {ticket.status !== "cerrado" ? (
              <form onSubmit={handleReply} className="flex items-end gap-2">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={2}
                  className="min-h-0 flex-1"
                  placeholder="Escribe una respuesta…"
                  maxLength={2000}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!reply.trim() || replyMutation.isPending}
                  aria-label="Enviar respuesta"
                >
                  {replyMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                Este ticket está cerrado.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RatingPanel({
  pending,
  onRate,
}: {
  pending: boolean;
  onRate: (rating: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-center">
      <p className="text-sm font-semibold text-success">Tu solicitud fue resuelta</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        ¿Qué tal fue la atención? Tu calificación cierra el ticket.
      </p>
      <div className="mt-3 flex justify-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={pending}
            onClick={() => onRate(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="p-1 transition-transform hover:scale-110"
            aria-label={`Calificar con ${n} estrellas`}
          >
            <Star
              className={cn(
                "h-6 w-6",
                n <= hover ? "fill-primary text-primary" : "text-muted-foreground",
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function AttachmentLink({ path, own }: { path: string; own: boolean }) {
  const getUrl = useServerFn(getFileSignedUrl);
  const [loading, setLoading] = useState(false);

  async function handleOpen() {
    setLoading(true);
    try {
      const { url } = await getUrl({ data: { bucket: "adjuntos", path } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("No se pudo abrir el adjunto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleOpen}
      disabled={loading}
      className={cn(
        "mt-1.5 inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-2",
        own ? "text-primary-foreground" : "text-primary",
      )}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
      Ver adjunto
    </button>
  );
}
