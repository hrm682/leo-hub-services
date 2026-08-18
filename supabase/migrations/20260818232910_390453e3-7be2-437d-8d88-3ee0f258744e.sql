-- 1) Metadatos en notificaciones (deduplicación + enlace al servicio)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2) Generador de recordatorios de renovación (corre dentro de la base de datos)
CREATE OR REPLACE FUNCTION public.generate_renewal_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_days integer;
  v_threshold integer;
  v_created integer := 0;
  v_title text;
BEGIN
  FOR r IN
    SELECT
      cs.id AS service_id,
      cs.user_id,
      cs.service_reference,
      cs.expiration_date,
      ((cs.expiration_date AT TIME ZONE 'America/Guayaquil')::date
        - (now() AT TIME ZONE 'America/Guayaquil')::date) AS days_left,
      p.name AS product_name,
      pr.notification_prefs AS prefs
    FROM public.customer_services cs
    LEFT JOIN public.products p ON p.id = cs.product_id
    LEFT JOIN public.profiles pr ON pr.id = cs.user_id
    WHERE cs.status = 'activo'
      AND cs.expiration_date IS NOT NULL
      AND cs.expiration_date <= now() + interval '8 days'
  LOOP
    v_days := r.days_left;
    v_threshold := CASE
      WHEN v_days <= 0 THEN 0
      WHEN v_days = 1 THEN 1
      WHEN v_days <= 3 THEN 3
      ELSE 7
    END;

    -- Respeta la preferencia de notificaciones in_app (activa por defecto)
    IF coalesce((r.prefs ->> 'in_app')::boolean, true) IS NOT true THEN
      CONTINUE;
    END IF;

    -- Evita duplicados: un aviso por servicio y por umbral
    IF EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = r.user_id
        AND n.type = 'recordatorio_renovacion'
        AND n.metadata ->> 'service_id' = r.service_id::text
        AND n.metadata ->> 'days' = v_threshold::text
    ) THEN
      CONTINUE;
    END IF;

    v_title := CASE v_threshold
      WHEN 7 THEN 'Tu servicio vence en 7 días'
      WHEN 3 THEN 'Tu servicio vence en 3 días'
      WHEN 1 THEN 'Tu servicio vence mañana'
      ELSE CASE WHEN v_days < 0 THEN 'Tu servicio ha vencido' ELSE 'Tu servicio vence hoy' END
    END;

    INSERT INTO public.notifications (user_id, type, title, content, metadata)
    VALUES (
      r.user_id,
      'recordatorio_renovacion',
      v_title,
      format('%s (%s) vence el %s. Renuévalo desde tu portal para mantener tu acceso sin interrupciones.',
        coalesce(r.product_name, 'Tu servicio'),
        r.service_reference,
        to_char(r.expiration_date AT TIME ZONE 'America/Guayaquil', 'DD/MM/YYYY')),
      jsonb_build_object(
        'service_id', r.service_id,
        'days', v_threshold,
        'expiration_date', r.expiration_date
      )
    );
    v_created := v_created + 1;
  END LOOP;
  RETURN v_created;
END;
$$;

-- Solo el sistema (cron / service_role) puede ejecutarla
REVOKE ALL ON FUNCTION public.generate_renewal_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_renewal_reminders() TO service_role;

-- 3) Programación diaria 13:00 UTC (08:00 Ecuador)
CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $unsched$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'recordatorios-renovacion') THEN
    PERFORM cron.unschedule('recordatorios-renovacion');
  END IF;
END $unsched$;
SELECT cron.schedule(
  'recordatorios-renovacion',
  '0 13 * * *',
  $job$SELECT public.generate_renewal_reminders();$job$
);