import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileImage, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  getFileSignedUrl,
  listPaymentsAdmin,
  reviewPayment,
} from "@/lib/admin.functions";
import { fmtDateTime, fmtUSD } from "@/lib/format";
import {
  PAYMENT_PROVIDER_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONES,
  TONE_CLASSES,
  type Tone,
} from "@/lib/status";
import { useIsStaff, useSession } from "@/lib/use-session";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/admin/pagos")({
  head: () => ({
    meta: [
      { title: "Pagos — LoMaximoLeo Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PagosPage,
});

type PaymentRow = Awaited<ReturnType<typeof listPaymentsAdmin>>["payments"][number];

function PagosPage() {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const { isAdmin } = useIsStaff(user?.id);

  const [statusFilter, setStatusFilter] = useState("todos");
  const [approveTarget, setApproveTarget] = useState<PaymentRow | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PaymentRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-pagos"],
    queryFn: () => listPaymentsAdmin(),
  });

  const reviewMutation = useMutation({
    mutationFn: (input: { paymentId: string; approve: boolean; reason?: string }) =>
      reviewPayment({ data: input }),
    onSuccess: (_r, vars) => {
      toast.success(vars.approve ? "Pago aprobado" : "Pago rechazado", {
        description: vars.approve
          ? "Los servicios de la orden fueron activados."
          : "El cliente fue notificado del motivo.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-pagos"] });
      queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
      setApproveTarget(null);
      setRejectTarget(null);
      setRejectReason("");
    },
    onError: (err) => {
      toast.error("No se pudo procesar", { description: err.message });
    },
  });

  async function viewReceipt(path: string) {
    setLoadingReceipt(true);
    try {
      const { url } = await getFileSignedUrl({ data: { bucket: "comprobantes", path } });
      setReceiptUrl(url);
    } catch (err) {
      toast.error("No se pudo abrir el comprobante", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoadingReceipt(false);
    }
  }

  const payments = (data?.payments ?? []).filter(
    (p) => statusFilter === "todos" || p.status === statusFilter,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Pagos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Revisa comprobantes y aprueba pagos para activar servicios.
            {!isAdmin && " (Solo administradores pueden aprobar o rechazar)"}
          </p>
        </div>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="pendiente">Pendientes</TabsTrigger>
          <TabsTrigger value="aprobado">Aprobados</TabsTrigger>
          <TabsTrigger value="rechazado">Rechazados</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
          No hay pagos en este estado.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Orden</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Método</th>
                <th className="px-4 py-3 font-medium">Monto</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Comprobante</th>
                {isAdmin && <th className="px-4 py-3 text-right font-medium">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3 text-muted-foreground">{fmtDateTime(p.created_at)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.order?.order_number ?? "—"}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{p.customer?.full_name || "Cliente"}</p>
                    {p.customer?.phone && (
                      <p className="text-xs text-muted-foreground">{p.customer.phone}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {PAYMENT_PROVIDER_LABELS[p.provider] ?? p.provider}
                  </td>
                  <td className="px-4 py-3 font-semibold">{fmtUSD(p.amount)}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={TONE_CLASSES[PAYMENT_STATUS_TONES[p.status] as Tone]}
                    >
                      {PAYMENT_STATUS_LABELS[p.status] ?? p.status}
                    </Badge>
                    {p.status === "rechazado" && p.rejection_reason && (
                      <p className="mt-1 max-w-44 truncate text-xs text-muted-foreground">
                        {p.rejection_reason}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.receipt_path ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewReceipt(p.receipt_path!)}
                        disabled={loadingReceipt}
                      >
                        {loadingReceipt ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FileImage className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Ver
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin subir</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      {p.status === "pendiente" && (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-success/40 text-success hover:bg-success/10"
                            onClick={() => setApproveTarget(p)}
                          >
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-destructive/40 text-destructive hover:bg-destructive/10"
                            onClick={() => setRejectTarget(p)}
                          >
                            <XCircle className="mr-1.5 h-3.5 w-3.5" />
                            Rechazar
                          </Button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={Boolean(approveTarget)} onOpenChange={() => setApproveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Aprobar este pago?</AlertDialogTitle>
            <AlertDialogDescription>
              Se marcará la orden {approveTarget?.order?.order_number} como pagada y sus servicios
              se activarán (o extenderán su vigencia si es una renovación).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                approveTarget &&
                reviewMutation.mutate({ paymentId: approveTarget.id, approve: true })
              }
              disabled={reviewMutation.isPending}
            >
              {reviewMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Aprobar pago
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={Boolean(rejectTarget)} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar pago</DialogTitle>
            <DialogDescription>
              El cliente verá este motivo en su notificación. Si era una renovación, el servicio
              seguirá activo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Motivo del rechazo</Label>
            <Textarea
              id="reject-reason"
              placeholder="Ej. El comprobante no muestra el monto completo…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              maxLength={300}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={reviewMutation.isPending || rejectReason.trim().length < 4}
              onClick={() =>
                rejectTarget &&
                reviewMutation.mutate({
                  paymentId: rejectTarget.id,
                  approve: false,
                  reason: rejectReason.trim(),
                })
              }
            >
              {reviewMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Rechazar pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(receiptUrl)} onOpenChange={() => setReceiptUrl(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Comprobante de pago</DialogTitle>
          </DialogHeader>
          {receiptUrl && (
            <img
              src={receiptUrl}
              alt="Comprobante de pago"
              className="max-h-[70vh] w-full rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
