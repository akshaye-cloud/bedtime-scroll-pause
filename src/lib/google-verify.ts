import { supabase } from "@/integrations/supabase/client";
import { GOOGLE_PENDING_KEY } from "@/components/GoogleButton";

/** After Google sign-in, email a confirmation code and sign out until it's entered. Returns the email, or null. */
export async function requireGoogleCode(): Promise<string | null> {
  if (sessionStorage.getItem(GOOGLE_PENDING_KEY) !== "1") return null;
  sessionStorage.removeItem(GOOGLE_PENDING_KEY);
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email) return null;
  await supabase.auth.signOut();
  await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: window.location.origin } });
  return email;
}
