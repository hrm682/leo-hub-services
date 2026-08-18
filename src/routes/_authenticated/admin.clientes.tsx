import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldPlus, ShieldMinus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { listCustomersAdmin, setUserRoleAdmin } from "@/lib/admin.functions";
import { fmtDate } from "@/lib/format";
import { TONE_CLASSES } from "@/lib/status";
import { useIsStaff, useSession } from "@/lib/use-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — Leo Hub Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientesPage,
});

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  soporte: "Soporte",
  cliente: "Cliente",
};

const ROLE_TONES: Record<string, string> = {
  admin: TONE_CLASSES.gold,
  soporte: TONE_CLASSES.info,
  cliente: TONE_CLASSES.neutral,
};

function ClientesPage() {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const { isAdmin } = useIsStaff(user?.id);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-clientes"],
    queryFn: () => listCustomersAdmin(),
  });

  const roleMutation = useMutation({
    mutationFn: (input: { targetUserId: string; action: "grant" | "revoke" }) =>
      setUserRoleAdmin({ data: { ...input, role: "soporte" } }),
    onSuccess: (_r, vars) => {
      toast.success(vars.action === "grant" ? "Rol de soporte asignado" : "Rol de soporte revocado");
      queryClient.invalidateQueries({ queryKey: ["admin-clientes"] });
    },
    onError: (err) => toast.error("No se pudo actualizar el rol", { description: err.message }),
  });

  const term = search.trim().toLowerCase();
  const customers = (data?.customers ?? []).filter((c) => {
    if (!term) return true;
    return (
      c.full_name.toLowerCase().includes(term) ||
      (c.phone ?? "").toLowerCase().includes(term) ||
      (c.document_number ?? "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Base de clientes y equipo. Los administradores pueden asignar el rol de soporte.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre, teléfono o documento…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

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
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Contacto</th>
                <th className="px-4 py-3 font-medium">Roles</th>
                <th className="px-4 py-3 font-medium">Servicios</th>
                <th className="px-4 py-3 font-medium">Desde</th>
                {isAdmin && <th className="px-4 py-3 text-right font-medium">Permisos</th>}
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const isSelf = c.id === user?.id;
                const hasSoporte = c.roles.includes("soporte");
                const isTargetAdmin = c.roles.includes("admin");
                return (
                  <tr key={c.id} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 font-display text-sm font-bold text-primary">
                          {(c.full_name || "C").charAt(0).toUpperCase()}
                        </div>
                        <p className="font-medium">{c.full_name || "Sin nombre"}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <p>{c.phone || "—"}</p>
                      {c.document_number && (
                        <p className="text-xs">Doc: {c.document_number}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.roles.map((r) => (
                          <Badge key={r} variant="outline" className={ROLE_TONES[r]}>
                            {ROLE_LABELS[r] ?? r}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-success">{c.activeServices}</span>
                      <span className="text-muted-foreground"> / {c.servicesCount} activos</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(c.created_at)}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        {!isSelf && !isTargetAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={roleMutation.isPending}
                            onClick={() =>
                              roleMutation.mutate({
                                targetUserId: c.id,
                                action: hasSoporte ? "revoke" : "grant",
                              })
                            }
                          >
                            {hasSoporte ? (
                              <>
                                <ShieldMinus className="mr-1.5 h-3.5 w-3.5" />
                                Quitar soporte
                              </>
                            ) : (
                              <>
                                <ShieldPlus className="mr-1.5 h-3.5 w-3.5" />
                                Hacer soporte
                              </>
                            )}
                          </Button>
                        )}
                        {isSelf && <span className="text-xs text-muted-foreground">Tú</span>}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
