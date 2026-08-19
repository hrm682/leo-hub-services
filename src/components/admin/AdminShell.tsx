import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Bell,
  CreditCard,
  Headset,
  LifeBuoy,
  LogOut,
  Menu,
  Package,
  ShieldAlert,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useIsStaff, useSession } from "@/lib/use-session";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/admin", label: "Reportes", icon: BarChart3, exact: true },
  { to: "/admin/pagos", label: "Pagos", icon: CreditCard },
  { to: "/admin/ordenes", label: "Órdenes", icon: ShoppingBag },
  { to: "/admin/tickets", label: "Tickets", icon: LifeBuoy },
  { to: "/admin/agentes", label: "Agentes", icon: Headset },
  { to: "/admin/notificaciones", label: "Notificaciones", icon: Bell },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/productos", label: "Productos", icon: Package, adminOnly: true },
];

function NavLinks({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={{ exact: item.exact ?? false }}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          )}
          activeProps={{ className: "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary" }}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user, isLoading: sessionLoading } = useSession();
  const { isStaff, isAdmin, roles, isLoading: rolesLoading } = useIsStaff(user?.id);
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (sessionLoading || (user && rolesLoading)) {
    return (
      <div className="flex min-h-screen bg-background">
        <div className="hidden w-64 border-r border-border lg:block" />
        <div className="flex-1 space-y-4 p-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!user || !isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="mt-6 font-display text-2xl font-bold">Acceso restringido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta área es exclusiva del equipo de LoMaximoLeo. Si crees que es un error, contacta al
            administrador.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button asChild variant="outline">
              <Link to="/">Ir al inicio</Link>
            </Button>
            <Button asChild variant="ghost" onClick={handleSignOut}>
              <span>Cerrar sesión</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const displayName =
    (user.user_metadata?.["full_name"] as string | undefined) || user.email || "Equipo";
  const roleLabel = isAdmin ? "Administrador" : roles.includes("soporte") ? "Soporte" : "Equipo";

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 py-5">
        <img src="/images/brand/logo-lion.png" alt="LoMaximoLeo" className="h-9 w-9" />
        <div>
          <p className="font-display text-base font-bold leading-tight">
            LoMaximo<span className="text-gold-gradient">Leo</span>
          </p>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Administración
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <NavLinks isAdmin={isAdmin} onNavigate={() => setMobileOpen(false)} />
      </div>
      <div className="border-t border-border p-3">
        <div className="mb-2 rounded-lg bg-secondary/60 px-3 py-2.5">
          <p className="truncate text-sm font-semibold">{displayName}</p>
          <p className="text-xs text-primary">{roleLabel}</p>
        </div>
        <div className="flex gap-1">
          <Button asChild variant="ghost" size="sm" className="flex-1 justify-start">
            <Link to="/">
              <LogOut className="mr-2 h-3.5 w-3.5 rotate-180" />
              Ver sitio
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start text-muted-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Salir
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-sidebar lg:block">
        {sidebar}
      </aside>

      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menú">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              {sidebar}
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <img src="/images/brand/logo-lion.png" alt="" className="h-7 w-7" />
            <span className="font-display text-sm font-bold">LoMaximoLeo Admin</span>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
