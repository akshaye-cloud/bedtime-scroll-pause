DELETE FROM auth.users WHERE email IN ('demo2@pause.app','demo3@pause.app','demo4@pause.app','demo5@pause.app','demo6@pause.app','demo7@pause.app','demo8@pause.app','demo9@pause.app','demo10@pause.app','demo11@pause.app','demo12@pause.app','demo13@pause.app','demo14@pause.app','demo15@pause.app');
DELETE FROM public.session_records r WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = r.user_id);

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.user_pins (
  user_id uuid PRIMARY KEY,
  pin_hash text NOT NULL,
  failed_attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.user_pins TO service_role;
ALTER TABLE public.user_pins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_my_pin(_pin text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _pin !~ '^[0-9]{4}$' THEN RAISE EXCEPTION 'PIN must be 4 digits'; END IF;
  INSERT INTO public.user_pins(user_id, pin_hash) VALUES (auth.uid(), extensions.crypt(_pin, extensions.gen_salt('bf')))
  ON CONFLICT (user_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, failed_attempts = 0, locked_until = NULL, updated_at = now();
END $$;
REVOKE ALL ON FUNCTION public.set_my_pin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_pin(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.has_my_pin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_pins WHERE user_id = auth.uid())
$$;
REVOKE ALL ON FUNCTION public.has_my_pin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_my_pin() TO authenticated;

-- returns 'ok', 'wrong', 'locked' or 'nopin'
CREATE OR REPLACE FUNCTION public.check_pin(_email text, _pin text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE uid uuid; rec public.user_pins;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE lower(email) = lower(_email);
  IF uid IS NULL THEN RETURN 'nopin'; END IF;
  SELECT * INTO rec FROM public.user_pins WHERE user_id = uid FOR UPDATE;
  IF NOT FOUND THEN RETURN 'nopin'; END IF;
  IF rec.locked_until IS NOT NULL AND rec.locked_until > now() THEN RETURN 'locked'; END IF;
  IF rec.pin_hash = extensions.crypt(_pin, rec.pin_hash) THEN
    UPDATE public.user_pins SET failed_attempts = 0, locked_until = NULL WHERE user_id = uid;
    RETURN 'ok';
  END IF;
  UPDATE public.user_pins SET failed_attempts = CASE WHEN rec.failed_attempts + 1 >= 5 THEN 0 ELSE rec.failed_attempts + 1 END,
    locked_until = CASE WHEN rec.failed_attempts + 1 >= 5 THEN now() + interval '15 minutes' ELSE NULL END
  WHERE user_id = uid;
  RETURN CASE WHEN rec.failed_attempts + 1 >= 5 THEN 'locked' ELSE 'wrong' END;
END $$;
REVOKE ALL ON FUNCTION public.check_pin(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_pin(text, text) TO service_role;