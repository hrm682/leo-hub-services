import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, LifeBuoy, RefreshCcw, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Leo Hub — Todo tu servicio, en un solo lugar" },
      {
        name: "description",
        content:
          "Leo Hub: compra, gestiona y renueva tus servicios digitales con soporte premium. Tu tranquilidad también es parte del servicio.",
      },
      { property: "og:title", content: "Leo Hub — Todo tu servicio, en un solo lugar" },
      {
        property: "og:description",
        content:
          "Compra, renueva y recibe soporte de tus servicios digitales desde un portal elegante y seguro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const FEATURES = [
  {
    icon: Sparkles,
    title: "Compra sin fricción",
    text: "Elige tu servicio, paga por Binance y sube tu comprobante en segundos.",
  },
  {
    icon: RefreshCcw,
    title: "Renovaciones claras",
    text: "Vigencia visible siempre. Renueva antes del vencimiento sin perder días.",
  },
  {
    icon: LifeBuoy,
    title: "Soporte que responde",
    text: "Tickets con seguimiento real y un equipo que te acompaña hasta resolver.",
  },
];

function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-1/2 h-[30rem] w-[60rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(closest-side, oklch(0.82 0.152 86), transparent)" }}
      />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <img src="/images/brand/logo-lion.png" alt="Leo Hub" className="h-10 w-10" />
          <span className="font-display text-xl font-bold tracking-tight">
            Leo <span className="text-gold-gradient">Hub</span>
          </span>
        </div>
        <Button asChild className="font-semibold">
          <Link to="/auth">
            Acceder
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6">
        <section className="py-16 text-center sm:py-24">
          <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Portal premium de servicios digitales
          </p>
          <h1 className="mx-auto max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            Todo tu servicio,{" "}
            <span className="text-gold-gradient">en un solo lugar.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            Compra, renueva y gestiona tus servicios digitales con una experiencia elegante y un
            soporte que sí responde. Tu tranquilidad también es parte del servicio.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="font-semibold">
              <Link to="/auth">
                Crear mi cuenta
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Ya soy cliente</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 pb-20 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass card-glow rounded-2xl p-6 text-left">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h2 className="mt-4 font-display text-lg font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="relative z-10 border-t border-border py-8">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Leo Hub — Servicios digitales con soporte premium.
        </p>
      </footer>
    </div>
  );
}
