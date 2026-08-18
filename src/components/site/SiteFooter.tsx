export function SiteFooter() {
  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <img src="/images/brand/icon-lion.png" alt="" className="h-5 w-5 opacity-70" />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Leo Hub — Servicios digitales con soporte premium.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Pagos seguros con Binance Pay</p>
      </div>
    </footer>
  );
}
