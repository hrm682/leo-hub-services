import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  LifeBuoy,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { fmtDate } from "@/lib/format";
import { privateProfilesQueryOptions } from "@/lib/queries";
import { createTicket, type getPrivateProfiles } from "@/lib/portal.functions";
import { createTicketSchema } from "@/lib/schemas";
import {
  serviceDisplayStatus,
  serviceTone,
  WARRANTY_LABELS,
  WARRANTY_TONES,
  warrantyState,
  TICKET_PRIORITY_LABELS,
} from "@/lib/status";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/portal/cuenta/privada")({
  loader: ({ context }) => context.queryClient.ensureQueryData(privateProfilesQueryOptions),
  head: () => ({
    meta: [
      { title: "Perfil privado y garantía — LoMaximoLeo" },
      {
        name: "description",
        content:
          "Consulta tu perfil privado con PIN y la garantía vigente de tus plataformas de streaming.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrivateProfilePage,
  errorComponent: PrivateProfileError,
});

type PrivateService = Awaited<ReturnType<typeof getPrivateProfiles>>["services"][number];

const WARRANTY_COVERAGE = [
  "Reposición de tu perfil si pierdes acceso por una falla de la cuenta",
  "Cambio de contraseña o de cuenta sin costo durante tu suscripción",
  "Soporte prioritario mientras tu plan esté activo",
];

function PrivateProfileError({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <div className="flex items-center justify-center py-24">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-semibold">
          No pudimos cargar tu perfil privado
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <Button className="mt-6" onClick={() => router.invalidate()}>
          Reintentar
        </Button>
      </div>
    </div>
  );
}

function PrivateProfilePage() {
  const { data } = useSuspenseQuery(privateProfilesQueryOptions);
  const navigate = useNavigate();
  const [claimService, setClaimService] = useState<PrivateService | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          Mi cuenta
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Actualiza tus datos personales, revisa tu perfil privado y gestiona tus solicitudes de
          ayuda.
        </p>
      </div>

      <Tabs
        value="privada"
        onValueChange={(value) => {
          if (value === "privada") return;
          navigate({
            to: "/portal/cuenta",
            search: { tab: value === "soporte" ? "soporte" : "perfil" },
            replace: true,
          });
        }}
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
          <TabsTrigger value="privada">
            <KeyRound className="mr-1.5 h-4 w-4" />
            Perfil privado
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="glass relative overflow-hidden rounded-2xl p-5 sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15">
            <KeyRound className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold">Tu perfil privado con PIN</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Cada plataforma incluye un perfil personal solo para ti, protegido con un PIN que
              nadie más conoce. No lo compartas: si pierdes acceso por una falla de la cuenta, la
              garantía te repone el perfil sin costo.
            </p>
          </div>
        </div>
      </div>

      {data.services.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <ShieldCheck className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold">Aún no tienes plataformas</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Cuando compres una cuenta de streaming, aquí verás tu perfil privado con su PIN y la
            garantía del producto.
          </p>
          <Button asChild className="mt-6 font-semibold">
            <Link to="/catalogo">
              <Store className="mr-1.5 h-4 w-4" />
              Explorar catálogo
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {data.services.map((service) => (
            <ServicePrivacyCard
              key={service.id}
              service={service}
              onClaim={() => setClaimService(service)}
            />
          ))}
        </div>
      )}

      <WarrantyClaimDialog service={claimService} onClose={() => setClaimService(null)} />
    </div>
  );
}

function ServicePrivacyCard({
  service,
  onClaim,
}: {
  service: PrivateService;
  onClaim: () => void;
}) {
  const warranty = warrantyState(service.status, service.expirationDate);
  const durationDays = service.product?.duration_days ?? 30;
  const percent =
    warranty.state === "activa" && warranty.daysLeft !== null
      ? Math.max(0, Math.min(100, Math.round((warranty.daysLeft / durationDays) * 100)))
      : warranty.state === "activa"
        ? 100
        : 0;
  const hasProfile = Boolean(service.profileName && service.profilePin);

  return (
    <article className="glass flex flex-col rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-3">
        {service.product?.image_url ? (
          <img
            src={service.product.image_url}
            alt={service.product?.name ?? "Plataforma de streaming"}
            className="h-14 w-14 rounded-xl border border-border/60 object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary">
            <KeyRound className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="truncate font-display text-base font-bold">
              {service.product?.name ?? "Servicio"}
            </h3>
            <StatusBadge tone={serviceTone(service.status, service.expirationDate)}>
              {serviceDisplayStatus(service.status, service.expirationDate)}
            </StatusBadge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {service.product?.billing_label ?? "Suscripción"} · Ref. {service.serviceReference}
          </p>
        </div>
      </div>

      <div className="mt-4">
        {hasProfile ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Tu perfil
              </dt>
              <dd className="mt-1 flex items-center justify-between gap-1">
                <span className="truncate font-semibold">{service.profileName}</span>
                <CopyButton value={service.profileName!} label="Nombre del perfil" />
              </dd>
            </div>
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                PIN del perfil
              </dt>
              <dd className="mt-1">
                <PinValue pin={service.profilePin!} />
              </dd>
            </div>
            {service.accountEmail && (
              <div className="rounded-xl border border-border/60 p-3 sm:col-span-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Cuenta de la plataforma
                </dt>
                <dd className="mt-1 flex items-center justify-between gap-1">
                  <span className="truncate font-mono text-sm">{service.accountEmail}</span>
                  <CopyButton value={service.accountEmail} label="Correo de la cuenta" />
                </dd>
              </div>
            )}
          </dl>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            {service.status === "pago_pendiente"
              ? "Tu perfil privado y su PIN se asignan automáticamente cuando tu pago sea aprobado."
              : "Estamos asignando tu perfil privado. Te avisaremos cuando esté listo."}
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          ¿Necesitas cambiar tu PIN o el nombre del perfil?{" "}
          <Link
            to="/portal/cuenta"
            search={{ tab: "soporte" }}
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            Abre una solicitud de soporte
          </Link>{" "}
          y lo actualizamos por ti.
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-border/60 bg-secondary/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Garantía del producto
          </p>
          <StatusBadge tone={WARRANTY_TONES[warranty.state]}>
            {WARRANTY_LABELS[warranty.state]}
          </StatusBadge>
        </div>

        {warranty.state === "activa" && (
          <div className="mt-3 space-y-1.5">
            <Progress value={percent} className="h-1.5" />
            <p className="text-xs text-muted-foreground">
              {warranty.daysLeft !== null ? (
                <>
                  Te quedan{" "}
                  <span className="font-semibold text-foreground">{warranty.daysLeft} días</span> de
                  cobertura · vigente hasta el {fmtDate(service.expirationDate)}
                </>
              ) : (
                "Cobertura vigente durante toda tu suscripción"
              )}
            </p>
          </div>
        )}
        {warranty.state === "por_activar" && (
          <p className="mt-2 text-xs text-muted-foreground">
            La garantía se activa automáticamente cuando tu pago sea aprobado y cubre toda tu
            suscripción.
          </p>
        )}
        {warranty.state === "vencida" && (
          <p className="mt-2 text-xs text-muted-foreground">
            Tu suscripción venció. Renueva tu servicio para recuperar la cobertura de la garantía.
          </p>
        )}
        {warranty.state === "suspendida" && (
          <p className="mt-2 text-xs text-muted-foreground">
            Tu servicio está suspendido. Abre una solicitud de soporte para revisar tu caso y
            reactivar la cobertura.
          </p>
        )}

        <ul className="mt-3 space-y-1.5">
          {WARRANTY_COVERAGE.map((item) => (
            <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/80">
          No cubre compartir tu acceso fuera de tu hogar, cambiar el correo o la contraseña de la
          cuenta, ni incumplir las reglas de la plataforma.
        </p>

        <Button
          className="mt-4 w-full font-semibold"
          variant={warranty.state === "activa" ? "default" : "outline"}
          disabled={warranty.state !== "activa"}
          onClick={onClaim}
        >
          <ShieldAlert className="mr-1.5 h-4 w-4" />
          Reclamar garantía
        </Button>
      </div>
    </article>
  );
}

function PinValue({ pin }: { pin: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center justify-between gap-1">
      <span className="font-mono text-base font-bold tracking-[0.3em]">
        {show ? pin : "•".repeat(pin.length)}
      </span>
      <div className="flex items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Ocultar PIN" : "Mostrar PIN"}
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
        <CopyButton value={pin} label="PIN" />
      </div>
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copiado al portapapeles`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0"
      onClick={handleCopy}
      aria-label={`Copiar ${label}`}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-success" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}

function WarrantyClaimDialog({
  service,
  onClose,
}: {
  service: PrivateService | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const submitTicket = useServerFn(createTicket);
  const [priority, setPriority] = useState<string>("media");
  const [description, setDescription] = useState("");

  const productName = service?.product?.name ?? "Servicio";
  const subject = `Reclamo de garantía — ${productName}`;

  const mutation = useMutation({
    mutationFn: (input: z.infer<typeof createTicketSchema>) => submitTicket({ data: input }),
    onSuccess: async (result) => {
      toast.success("Reclamo de garantía enviado", {
        description: `Tu ticket ${result.ticketNumber} fue registrado. Te contactaremos lo antes posible.`,
      });
      await queryClient.invalidateQueries({ queryKey: ["portal"] });
      handleClose();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar el reclamo");
    },
  });

  function handleClose() {
    setDescription("");
    setPriority("media");
    onClose();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!service) return;
    const parsed = createTicketSchema.safeParse({
      customerServiceId: service.id,
      category: "garantia",
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
    <Dialog open={Boolean(service)} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Reclamar garantía
          </DialogTitle>
          <DialogDescription>
            {productName} · Ref. {service?.serviceReference}. Cuéntanos qué pasó y repondremos tu
            acceso sin costo si el reclamo aplica.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Tema
            </p>
            <p className="mt-0.5 font-medium">{subject}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="claim-priority">Prioridad</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="claim-priority">
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

          <div className="space-y-2">
            <Label htmlFor="claim-description">¿Qué sucedió?</Label>
            <Textarea
              id="claim-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Ej. Mi perfil desapareció de la cuenta / el PIN dejó de funcionar…"
              maxLength={2000}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="font-semibold">
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar reclamo
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
