CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.session_records (
  id text NOT NULL,
  user_id uuid NOT NULL,
  data jsonb NOT NULL,
  ended_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_records TO authenticated;
GRANT ALL ON public.session_records TO service_role;
ALTER TABLE public.session_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own records read" ON public.session_records FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own records insert" ON public.session_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own records update" ON public.session_records FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own records delete" ON public.session_records FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, left(coalesce(NEW.raw_user_meta_data->>'name', ''), 100))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DO $$
DECLARE
  names text[] := ARRAY['Aarav Shah','Diya Patel','Rohan Mehta','Ananya Iyer','Kabir Singh','Meera Nair','Arjun Rao','Isha Kapoor','Vivaan Gupta','Sara Thomas','Nikhil Verma','Priya Menon','Dev Joshi','Tara Das','Kiran Bose'];
  i int; uid uuid; em text;
BEGIN
  FOR i IN 1..15 LOOP
    uid := gen_random_uuid();
    em := 'demo' || i || '@pause.app';
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token, phone_change, phone_change_token)
    VALUES ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', em,
      extensions.crypt('PauseDemo' || i || '!', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('name', names[i]), now(), now(),
      '', '', '', '', '', '', '', '');
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', em, 'email_verified', true), 'email', now(), now(), now());
  END LOOP;
END $$;