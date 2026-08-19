import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import {
  listCustomerServicesAdmin,
  updateServiceCredentialsAdmin,
} from "@/lib/admin.functions";
import { fmtDate } from "@/lib/format";
import { serviceCredentialsSchema } from "@/lib/schemas";
import { SERVICE_STATUS_LABELS, TONE_CLASSES } from "@/lib/status";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";

type AdminService = Awaited<ReturnType<typeof listCustomerServicesAdmin>>["services"][number];

export function ServiceCredentialsDialog({
  customer,
  onClose,
}: {
  customer: { id: string; full_name: string } | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-cliente-servicios", customer?.id],
    queryFn: () => listCustomerServicesAdmin({ data: { userId: customer!.id } }),
    enabled: Boolean(customer),
  });

  const services = data?.services ?? [];

  return (
    <Dialog open={Boolean(customer)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Perfiles privados de {customer?.full_name}
          </DialogTitle>
          <DialogDescription>
            Asigna o actualiza el perfil y el PIN de cada plataforma. El cliente los verá en Mi
            cuenta → Perfil privado.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Este cliente no tiene servicios todavía.
          </p>
        ) : (
          <div className="space-y-4">
            {services.map((service) => (
              <CredentialsForm key={service.id} service={service} customerId={customer!.id} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CredentialsForm({
  service,
  customerId,
}: {
  service: AdminService;
  customerId: string;
}) {
  const queryClient = useQueryClient();
  const [profileName, setProfileName] = useState(service.profile_name ?? "");
  const [profilePin, setProfilePin] = useState(service.profile_pin ?? "");
  const [accountEmail, setAccountEmail] = useState(service.account_email ?? "");

  const mutation = useMutation({
    mutationFn: (input: z.infer<typeof serviceCredentialsSchema>) =>
      updateServiceCredentialsAdmin({ data: input }),
    onSuccess: async () => {
      toast.success("Perfil privado guardado", {
        description: `${service.service_reference} actualizado. El cliente recibió una notificación.`,
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin-cliente-servicios", customerId],
      });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el perfil");
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = serviceCredentialsSchema.safeParse({
      serviceId: service.id,
      profileName,
      profilePin,
      accountEmail,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Revisa los campos");
      return;
    }
    mutation.mutate(parsed.data);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-border/60 bg-secondary/20 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{service.product?.name ?? "Servicio"}</p>
          <p className="text-xs text-muted-foreground">
            Ref. {service.service_reference} · vence {fmtDate(service.expiration_date)}
          </p>
        </div>
        <Badge variant="outline" className={TONE_CLASSES.neutral}>
          {SERVICE_STATUS_LABELS[service.status] ?? service.status}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={`pn-${service.id}`}>Perfil</Label>
          <Input
            id={`pn-${service.id}`}
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder="Perfil 1"
            maxLength={60}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`pp-${service.id}`}>PIN</Label>
          <Input
            id={`pp-${service.id}`}
            value={profilePin}
            onChange={(e) => setProfilePin(e.target.value)}
            placeholder="4 a 8 dígitos"
            inputMode="numeric"
            maxLength={8}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`pe-${service.id}`}>Correo de la cuenta</Label>
          <Input
            id={`pe-${service.id}`}
            value={accountEmail}
            onChange={(e) => setAccountEmail(e.target.value)}
            placeholder="Opcional"
            maxLength={255}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={mutation.isPending} className="font-semibold">
          {mutation.isPending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="mr-1.5 h-3.5 w-3.5" />
          )}
          Guardar perfil
        </Button>
      </div>
    </form>
  );
}
