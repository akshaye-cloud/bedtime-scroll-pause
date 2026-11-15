import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { device, isSessionExpired } from "@/lib/auth-rules";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/" });
    // Sessions end 7 days after the last sign-in.
    if (device.getSignedInAt() === null) device.markSignedIn();
    if (isSessionExpired(device.getSignedInAt(), Date.now())) {
      await supabase.auth.signOut();
      device.clearSignedIn();
      throw redirect({ to: "/" });
    }
  },
  component: () => <Outlet />,
});
