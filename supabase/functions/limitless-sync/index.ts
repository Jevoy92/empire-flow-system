// Limitless lifelog sync — pulls new entries from Limitless API and stores in DB.
// Can be invoked by: (a) authenticated user (manual sync) or (b) cron with service-role/cron secret.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LIMITLESS_BASE = "https://api.limitless.ai/v1";

interface Lifelog {
  id: string;
  title?: string;
  summary?: string;
  startTime?: string;
  endTime?: string;
  markdown?: string;
  contents?: Array<{ speakerName?: string; content?: string; type?: string }>;
}

async function fetchLifelogs(apiKey: string, cursor: string | null) {
  const all: Lifelog[] = [];
  let next: string | null = cursor;
  let pages = 0;
  // Cap pages to avoid runaway loops on first sync
  while (pages < 20) {
    const url = new URL(`${LIMITLESS_BASE}/lifelogs`);
    url.searchParams.set("limit", "10");
    url.searchParams.set("direction", "asc");
    url.searchParams.set("includeMarkdown", "true");
    url.searchParams.set("includeHeadings", "true");
    if (next) url.searchParams.set("cursor", next);

    const res = await fetch(url.toString(), {
      headers: { "X-API-Key": apiKey },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Limitless API ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = await res.json();
    const items: Lifelog[] = data?.data?.lifelogs ?? [];
    all.push(...items);

    next = data?.meta?.lifelogs?.nextCursor ?? null;
    pages++;
    if (!next || items.length === 0) break;
  }
  return { items: all, nextCursor: next };
}

async function syncForUser(supabase: any, userId: string, apiKey: string) {
  const { data: stateRow } = await supabase
    .from("limitless_sync_state")
    .select("last_cursor")
    .eq("user_id", userId)
    .maybeSingle();

  const { items, nextCursor } = await fetchLifelogs(apiKey, stateRow?.last_cursor ?? null);

  if (items.length > 0) {
    const rows = items.map((l) => {
      const speakers = Array.from(
        new Set((l.contents ?? []).map((c) => c.speakerName).filter(Boolean))
      );
      const transcript = (l.contents ?? [])
        .map((c) => (c.speakerName ? `${c.speakerName}: ${c.content ?? ""}` : c.content ?? ""))
        .filter(Boolean)
        .join("\n");
      return {
        user_id: userId,
        lifelog_id: l.id,
        title: l.title ?? null,
        summary: l.summary ?? null,
        transcript: l.markdown ?? transcript ?? null,
        speakers,
        started_at: l.startTime ?? null,
        ended_at: l.endTime ?? null,
        raw: l,
        synced_at: new Date().toISOString(),
      };
    });

    const { error: upErr } = await supabase
      .from("limitless_lifelogs")
      .upsert(rows, { onConflict: "user_id,lifelog_id" });
    if (upErr) throw upErr;
  }

  const { count } = await supabase
    .from("limitless_lifelogs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  await supabase.from("limitless_sync_state").upsert(
    {
      user_id: userId,
      last_cursor: nextCursor ?? stateRow?.last_cursor ?? null,
      last_synced_at: new Date().toISOString(),
      last_status: "ok",
      last_error: null,
      lifelog_count: count ?? 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  return { synced: items.length, total: count ?? 0 };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LIMITLESS_API_KEY");
    if (!apiKey) throw new Error("LIMITLESS_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Determine target user(s)
    const authHeader = req.headers.get("Authorization");
    let body: any = {};
    try { body = await req.json(); } catch { /* no body */ }

    let userIds: string[] = [];

    if (body?.allUsers === true) {
      // Cron mode: sync every user that has a sync_state row OR fall back to all profiles
      const { data: stateUsers } = await admin
        .from("limitless_sync_state")
        .select("user_id");
      if (stateUsers && stateUsers.length > 0) {
        userIds = stateUsers.map((r: any) => r.user_id);
      } else {
        const { data: profiles } = await admin.from("profiles").select("id");
        userIds = (profiles ?? []).map((p: any) => p.id);
      }
    } else if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await admin.auth.getUser(token);
      if (!user) throw new Error("Not authenticated");
      userIds = [user.id];
    } else {
      throw new Error("No auth and allUsers not set");
    }

    const results: Record<string, any> = {};
    for (const uid of userIds) {
      try {
        results[uid] = await syncForUser(admin, uid, apiKey);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results[uid] = { error: msg };
        await admin.from("limitless_sync_state").upsert(
          {
            user_id: uid,
            last_status: "error",
            last_error: msg.slice(0, 500),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("limitless-sync error:", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
