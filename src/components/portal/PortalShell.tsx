import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutGrid,
  LifeBuoy,
  LogOut,
  Menu,
  ShieldCheck,
  ShoppingCart,
  Store,
  UserRound,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { useIsStaff, useSession } from "@/lib/use-session";
import { NotificationsBell } from "@/components/portal/NotificationsBell";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

const NAV_LINKS = [
  { to: "/portal", label: "Mis servicios", icon: LayoutGrid, exact: true },
  { to: "/catalogo", label: "Catálogo", icon: Store, exact: false },
  { to: "/carrito", label: "Carrito", icon: ShoppingCart, exact: false },
] as const;

export function PortalShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { count } = useCart();
  const { data: user, isLoading } = useSession();
  const { isStaff } = useIsStaff(user?.id);
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const displayName =
    (user?.user_metadata?.["full_name"] as string | undefined) || user?.email || "Cliente";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/images/brand/logo-lion.png" alt="Leo Hub" className="h-9 w-9" />
            <div className="leading-tight">
              <p className="font-display text-base font-bold">
                Leo <span className="text-gold-gradient">Hub</span>
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Portal del cliente
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                activeOptions={{ exact: link.exact }}
                className="relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                activeProps={{ className: "text-primary hover:text-primary" }}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
                {link.to === "/carrito" && count > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {count}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <NotificationsBell />
            {isLoading ? (
              <Skeleton className="hidden h-9 w-32 md:block" />
            ) : (
              <div className="hidden items-center gap-3 md:flex">
                {isStaff && (
                  <Button asChild variant="outline" size="sm">
                    <Link to="/admin">
                      <ShieldCheck className="mr-1.5 h-4 w-4" />
                      Admin
                    </Link>
                  </Button>
                )}
                <div className="text-right leading-tight">
                  <Link
                    to="/portal/cuenta"
                    title="Mi cuenta"
                    className="block max-w-40 truncate text-sm font-semibold transition-colors hover:text-primary"
                  >
                    {displayName}
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <LogOut className="h-3 w-3" />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menú">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 bg-sidebar">
                <div className="flex flex-col gap-1 pt-6">
                  {NAV_LINKS.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      activeOptions={{ exact: link.exact }}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      activeProps={{ className: "bg-primary/10 text-primary" }}
                    >
                      <link.icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  ))}
                  <Link
                    to="/portal/cuenta"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    activeProps={{ className: "bg-primary/10 text-primary" }}
                  >
                    <UserRound className="h-4 w-4" />
                    Mi cuenta
                  </Link>
                  {isStaff && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Panel de administración
                    </Link>
                  )}
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="truncate px-3 pb-2 text-xs text-muted-foreground">
                      {user?.email}
                    </p>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-muted-foreground"
                      onClick={handleSignOut}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Cerrar sesión
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 sm:px-6 sm:pb-10 sm:pt-8">
        {children}
      </main>

      <Link
        to="/portal/cuenta"
        search={{ tab: "soporte" }}
        aria-label="Ayuda y soporte"
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105"
      >
        <LifeBuoy className="h-4 w-4" />
        Ayuda
      </Link>
    </div>
  );
}
