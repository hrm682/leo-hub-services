import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

export const Route = createFileRoute("/privacidad")({
  head: () => ({
    meta: [
      { title: "Política de Privacidad — LoMaximoLeo" },
      {
        name: "description",
        content: "Cómo LoMaximoLeo recopila, usa y protege tus datos personales.",
      },
    ],
  }),
  component: PrivacidadPage,
});

function PrivacidadPage() {
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
          Política de Privacidad
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última actualización: {new Date().getFullYear()}. Tu privacidad es importante para
          nosotros.
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="font-display text-lg font-bold text-foreground">
              1. Datos que recopilamos
            </h2>
            <p className="mt-2">
              Recopilamos los datos que nos proporcionas al registrarte y comprar: nombre, correo
              electrónico, teléfono y, opcionalmente, número de documento. También registramos
              información de tus órdenes, pagos (comprobantes o referencias de transacción), tickets
              de soporte y notificaciones.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">
              2. Cómo usamos tus datos
            </h2>
            <p className="mt-2">
              Usamos tus datos para procesar compras y renovaciones, activar y dar soporte a tus
              servicios, enviarte notificaciones sobre tus pedidos, prevenir fraudes y cumplir
              obligaciones legales. No vendemos tus datos personales.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">
              3. Proveedores (terceros)
            </h2>
            <p className="mt-2">
              Nos apoyamos en proveedores para operar: <strong>Supabase</strong> (base de datos,
              autenticación y almacenamiento) y <strong>Binance Pay</strong> (procesamiento de
              pagos). Estos proveedores tratan datos según sus propias políticas. No compartimos tus
              datos con terceros con fines publicitarios.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">4. Seguridad</h2>
            <p className="mt-2">
              Protegemos tus datos con seguridad por filas (cada usuario accede solo a lo suyo),
              cifrado en tránsito (HTTPS), enlaces de archivos temporales y manejo de secretos del
              lado del servidor. Ningún sistema es 100% infalible, pero aplicamos buenas prácticas
              de la industria.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">5. Tus derechos</h2>
            <p className="mt-2">
              Puedes acceder, corregir o solicitar la eliminación de tus datos personales desde tu
              perfil o contactándonos por soporte. Atenderemos tu solicitud conforme a la normativa
              aplicable de protección de datos.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">6. Cookies y sesión</h2>
            <p className="mt-2">
              Usamos almacenamiento local del navegador para mantener tu sesión iniciada y el
              carrito de compras. No usamos cookies de rastreo publicitario de terceros.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">7. Retención</h2>
            <p className="mt-2">
              Conservamos tus datos mientras tengas una cuenta activa y por el tiempo necesario para
              cumplir obligaciones legales, contables y de soporte.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">8. Contacto</h2>
            <p className="mt-2">
              Para ejercer tus derechos o resolver dudas de privacidad, usa el chat de soporte o
              crea un ticket desde tu cuenta.
            </p>
            <p className="mt-2">
              Responsable del tratamiento: <strong>[Razón social]</strong> · RUC / Cédula: [RUC] ·
              [Ciudad], Ecuador · Correo: [correo@tudominio.com]. (Datos por completar con tu
              información real.)
            </p>
          </section>
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          Consulta también nuestros{" "}
          <Link to="/terminos" className="text-primary hover:underline">
            Términos y Condiciones
          </Link>
          .
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
