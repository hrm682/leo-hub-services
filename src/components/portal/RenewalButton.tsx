import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { fmtUSD } from "@/lib/format";
import { createRenewalOrder } from "@/lib/shop.functions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface RenewalButtonProps {
  serviceId: string;
  productName: string;
  price: number;
  durationDays: number;
  className?: string;
}

export function RenewalButton({
  serviceId,
  productName,
  price,
  durationDays,
  className,
}: RenewalButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const renew = useServerFn(createRenewalOrder);

  async function handleConfirm() {
    setPending(true);
    try {
      const result = await renew({ data: { serviceId } });
      toast.success("Renovación creada", {
        description: "Completa el pago para extender tu vigencia sin perder días.",
      });
      await queryClient.invalidateQueries({ queryKey: ["portal"] });
      setOpen(false);
      navigate({ to: "/pago/$orderId", params: { orderId: result.orderId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear la renovación");
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button className={className ?? "font-semibold"}>
          <RefreshCcw className="mr-1.5 h-4 w-4" />
          Renovar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Renovar {productName}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Se creará una orden de renovación por{" "}
                <strong className="text-foreground">{fmtUSD(price)}</strong> que añade{" "}
                <strong className="text-foreground">{durationDays} días</strong> a tu vigencia
                actual. Si renuevas antes del vencimiento, los días se acumulan.
              </p>
              <p>Después de confirmar, podrás pagar con Binance y subir tu comprobante.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <Button onClick={handleConfirm} disabled={pending} className="font-semibold">
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar renovación
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
