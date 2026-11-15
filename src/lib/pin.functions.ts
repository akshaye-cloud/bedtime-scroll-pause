import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Public by design: the PIN itself is the credential. Failed tries lock for 15 minutes in the database.
export const pinSignIn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ email: z.string().trim().email().max(254), pin: z.string().regex(/^\d{4}$/) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("check_pin", { _email: data.email, _pin: data.pin });
    if (error) return { status: "error" as const };
    if (result !== "ok") return { status: result as "wrong" | "locked" | "nopin" };
    const link = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: data.email });
    const tokenHash = link.data?.properties?.hashed_token;
    if (link.error || !tokenHash) return { status: "error" as const };
    return { status: "ok" as const, tokenHash };
  });
