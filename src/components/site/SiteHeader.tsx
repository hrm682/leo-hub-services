import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, LogOut, Menu, ShieldCheck, ShoppingCart } from "lucide-react";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { useIsStaff, useSession } from "@/lib/use-session";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV_LINKS = [
  { to: "/", label: "Inicio", exact: true },
  { to: "/catalogo", label: "Catálogo", exact: false },
] as const;

export function SiteHeader() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { count } = useCart();
  const { data: user } = useSession();
  const { isStaff } = useIsStaff(user?.id);
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName =
    (user?.user_metadata?.["full_name"] as string | undefined) || user?.email || "";

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const cartButton = (
    <Button asChild variant="ghost" size="icon" className="relative" aria-label="Ver carrito">
      <Link to="/carrito">
        <ShoppingCart className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {count}
          </span>
        )}
      </Link>
    </Button>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src="/images/brand/leo-logo.jpg"
            alt="Lo Máximo Leo"
            className="h-9 w-9 rounded-full ring-1 ring-primary/40"
          />
          <span className="font-display text-lg font-bold tracking-tight">
            LoMaximo<span className="text-gold-gradient">Leo</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              activeOptions={{ exact: link.exact }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{ className: "text-primary hover:text-primary" }}
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <Link
              to="/portal"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{ className: "text-primary hover:text-primary" }}
            >
              Mis servicios
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-1.5">
          {cartButton}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="hidden max-w-44 gap-2 md:inline-flex">
                  <span className="truncate text-sm">{displayName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate text-xs text-muted-foreground">
                  {user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/portal" className="cursor-pointer">
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    Mis servicios
                  </Link>
                </DropdownMenuItem>
                {isStaff && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="cursor-pointer">
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Panel de administración
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-muted-foreground"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild className="hidden font-semibold md:inline-flex">
              <Link to="/auth">Acceder</Link>
            </Button>
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
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    activeProps={{ className: "bg-primary/10 text-primary" }}
                  >
                    {link.label}
                  </Link>
                ))}
                {user && (
                  <Link
                    to="/portal"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    activeProps={{ className: "bg-primary/10 text-primary" }}
                  >
                    Mis servicios
                  </Link>
                )}
                {user && isStaff && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    Panel de administración
                  </Link>
                )}
                <div className="mt-4 border-t border-border pt-4">
                  {user ? (
                    <>
                      <p className="truncate px-3 pb-2 text-xs text-muted-foreground">
                        {user.email}
                      </p>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground"
                        onClick={handleSignOut}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Cerrar sesión
                      </Button>
                    </>
                  ) : (
                    <Button asChild className="w-full font-semibold">
                      <Link to="/auth" onClick={() => setMobileOpen(false)}>
                        Acceder
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
