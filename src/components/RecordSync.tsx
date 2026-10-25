import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { store, type SessionRecord } from "@/lib/pause";

const OWNER_KEY = "pause.recordsOwner";

/** Keeps the device's saved sessions in step with the signed-in account. */
export function RecordSync() {
  useEffect(() => {
    let userId: string | null = null;

    const load = async (uid: string) => {
      userId = uid;
      if (localStorage.getItem(OWNER_KEY) !== uid) {
        // A different account signed in on this device: don't mix records.
        store.replaceRecords([]);
        localStorage.setItem(OWNER_KEY, uid);
      }
      const { data, error } = await supabase
        .from("session_records")
        .select("data")
        .order("ended_at", { ascending: false });
      if (error || userId !== uid) return;
      const remote = (data ?? []).map((row) => row.data as unknown as SessionRecord);
      const ids = new Set(remote.map((r) => r.id));
      const localOnly = store.getRecords().filter((r) => !ids.has(r.id));
      if (localOnly.length) {
        await supabase.from("session_records").upsert(
          localOnly.map((r) => ({ id: r.id, user_id: uid, data: r as never, ended_at: new Date(r.endedAt).toISOString() })),
        );
      }
      store.replaceRecords([...localOnly, ...remote].sort((a, b) => b.endedAt - a.endedAt));
      window.dispatchEvent(new CustomEvent("pause:records-synced"));
    };

    const onAdded = (e: Event) => {
      const r = (e as CustomEvent<SessionRecord>).detail;
      if (!userId || !r) return;
      void supabase.from("session_records").upsert({ id: r.id, user_id: userId, data: r as never, ended_at: new Date(r.endedAt).toISOString() });
    };
    const onCleared = () => {
      if (userId) void supabase.from("session_records").delete().eq("user_id", userId);
    };

    void supabase.auth.getUser().then(({ data }) => { if (data.user) void load(data.user.id); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user && session.user.id !== userId) void load(session.user.id);
      if (event === "SIGNED_OUT") {
        userId = null;
        store.replaceRecords([]);
        store.setActive(null);
        store.clearResume();
        localStorage.removeItem(OWNER_KEY);
      }
    });
    window.addEventListener("pause:record-added", onAdded);
    window.addEventListener("pause:records-cleared", onCleared);
    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("pause:record-added", onAdded);
      window.removeEventListener("pause:records-cleared", onCleared);
    };
  }, []);
  return null;
}
