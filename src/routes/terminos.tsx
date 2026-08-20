import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

export const Route = createFileRoute("/terminos")({
  head: () => ({
    meta: [
      { title: "Términos y Condiciones — LoMaximoLeo" },
      {
        name: "description",
        content: "Términos y condiciones de uso del servicio LoMaximoLeo.",
      },
    ],
  }),
  component: TerminosPage,
});

function TerminosPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>

        <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight">
          Términos y Condiciones
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última actualización: {new Date().getFullYear()}. Al usar LoMaximoLeo aceptas estos
          términos.
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="font-display text-lg font-bold text-foreground">
              1. Objeto del servicio
            </h2>
            <p className="mt-2">
              LoMaximoLeo comercializa el acceso a suscripciones de plataformas de streaming y
              servicios digitales de terceros, con activación, renovación y soporte. No somos las
              plataformas oficiales ni estamos afiliados a ellas; sus marcas pertenecen a sus
              respectivos titulares.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">
              2. Cuentas y perfiles
            </h2>
            <p className="mt-2">
              Entregamos accesos o perfiles según el producto adquirido, con su respectiva vigencia.
              El uso es personal e intransferible. No debes cambiar contraseñas, correos maestros ni
              configuraciones que afecten el servicio o a otros usuarios. LoMaximoLeo nunca te
              pedirá contraseñas ni códigos de servicios externos.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">3. Pagos</h2>
            <p className="mt-2">
              Los pagos se procesan mediante Binance Pay (automático) o por comprobante manual. El
              servicio se activa una vez confirmado el pago. Los precios están expresados en dólares
              de los Estados Unidos (USD). El pago con criptomoneda se realiza en USDT.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">
              4. Renovaciones y garantía
            </h2>
            <p className="mt-2">
              Puedes renovar tus servicios antes o al vencimiento generando una nueva orden. Durante
              la vigencia contratada ofrecemos garantía y soporte: si un acceso presenta fallas por
              causas atribuibles a nosotros, lo reponemos dentro de esa vigencia. La garantía no
              cubre suspensiones causadas por mal uso, incumplimiento de estos términos o cambios de
              las plataformas ajenos a nuestro control.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">5. Uso permitido</h2>
            <p className="mt-2">
              No está permitido revender, compartir fuera de lo autorizado, ni usar los servicios
              para fines ilícitos. El incumplimiento puede resultar en la suspensión sin reembolso.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">6. Reembolsos</h2>
            <p className="mt-2">
              Por la naturaleza digital del servicio, los reembolsos se evalúan caso por caso cuando
              no ha sido posible entregar o reponer el acceso contratado. Escríbenos por los canales
              de soporte de la plataforma para gestionar tu caso.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">7. Responsabilidad</h2>
            <p className="mt-2">
              LoMaximoLeo no se responsabiliza por interrupciones, cambios de precio o de políticas
              de las plataformas de terceros. Nuestra responsabilidad se limita al valor del
              servicio contratado y vigente.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">
              8. Cambios y ley aplicable
            </h2>
            <p className="mt-2">
              Podemos actualizar estos términos; la versión vigente estará siempre disponible en
              esta página. Estos términos se rigen por las leyes de la República del Ecuador.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">9. Contacto</h2>
            <p className="mt-2">
              Para consultas sobre estos términos, utiliza el chat de soporte o crea un ticket desde
              tu cuenta.
            </p>
          </section>
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          Consulta también nuestra{" "}
          <Link to="/privacidad" className="text-primary hover:underline">
            Política de Privacidad
          </Link>
          .
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
