-- Respuestas guardadas (plantillas del equipo de soporte)
CREATE TABLE public.saved_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_replies TO authenticated;
GRANT ALL ON public.saved_replies TO service_role;

ALTER TABLE public.saved_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read saved replies" ON public.saved_replies
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff create saved replies" ON public.saved_replies
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff update saved replies" ON public.saved_replies
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff delete saved replies" ON public.saved_replies
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE TRIGGER saved_replies_updated_at BEFORE UPDATE ON public.saved_replies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Plantillas iniciales
INSERT INTO public.saved_replies (title, content) VALUES
  ('Saludo inicial', '¡Hola! Gracias por escribir a LoMaximoLeo. Ya estoy revisando tu caso y te doy una respuesta en unos minutos.'),
  ('Pago en revisión', 'Tu comprobante de pago está en revisión. En cuanto se confirme, tu servicio se activa automáticamente y recibes una notificación. ¡Gracias por tu paciencia!'),
  ('Datos de acceso', 'Puedes ver tu perfil, PIN y correo de la cuenta en Mi cuenta → Perfil privado. Ahí siempre tendrás tus credenciales actualizadas.'),
  ('Reinicio de sesión', 'Por favor cierra sesión en todos los dispositivos y vuelve a ingresar con tu perfil y PIN. Si el problema continúa, avísame por este medio.'),
  ('Cierre de ticket', 'Me alegra haberte ayudado. Marcaré tu solicitud como resuelta; si lo deseas puedes calificar la atención desde tu portal. ¡Gracias por confiar en LoMaximoLeo!');

-- Adjuntos: el equipo puede subir archivos (incluida la carpeta del cliente para que este los lea)
CREATE POLICY "staff upload attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'adjuntos' AND public.is_staff(auth.uid()));

-- Chat en vivo: realtime en mensajes y tickets de soporte (RLS sigue aplicando)
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;