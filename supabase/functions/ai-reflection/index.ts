// AI Reflection — short "what's on my mind" thought for the home screen.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) throw new Error("Not authenticated");

    // Gather lightweight context
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [sessionsRes, projectsRes, lifelogsRes, insightsRes, notesRes] = await Promise.all([
      supabase.from("sessions").select("focus,venture,status,duration_minutes,created_at")
        .eq("user_id", user.id).gte("created_at", since7d).order("created_at", { ascending: false }).limit(8),
      supabase.from("projects").select("name,venture,current_stage,stages,status")
        .eq("user_id", user.id).neq("status", "completed").order("updated_at", { ascending: false }).limit(5),
      supabase.from("limitless_lifelogs").select("title,summary,started_at")
        .eq("user_id", user.id).gte("started_at", since24h).order("started_at", { ascending: false }).limit(6),
      supabase.from("ai_user_insights").select("recent_context").eq("user_id", user.id).maybeSingle(),
      supabase.from("future_notes").select("content,created_at").eq("user_id", user.id)
        .eq("is_read", false).order("created_at", { ascending: false }).limit(5),
    ]);

    const sessions = sessionsRes.data ?? [];
    const projects = projectsRes.data ?? [];
    const lifelogs = lifelogsRes.data ?? [];
    const pending = (insightsRes.data?.recent_context as any)?.pending_items ?? [];
    const notes = notesRes.data ?? [];

    const ctx = {
      hour: new Date().getHours(),
      recent_sessions: sessions.map((s: any) => ({ focus: s.focus, status: s.status, when: s.created_at })),
      active_projects: projects.map((p: any) => {
        const stages = Array.isArray(p.stages) ? p.stages : [];
        const stage = stages[p.current_stage];
        return { name: p.name, current_stage: stage?.name ?? null };
      }),
      lifelogs_24h: lifelogs.map((l: any) => ({ title: l.title, summary: (l.summary ?? "").slice(0, 220) })),
      pending_items: pending.slice(-3),
      unread_notes: notes.map((n: any) => (n.content ?? "").slice(0, 140)),
    };

    const system = `You are the user's quiet, thoughtful work companion. In 1–2 sentences (max 35 words), reflect on what's most worth their attention right now. Be specific to the context: reference a project name, a lifelog topic, or a pending item. Tone: calm, grounded, observational — never hype, never emoji, never exclamation marks. Do not greet them. Do not ask a question. Start with a phrase like "I'm noticing…", "Looks like…", "The thread I keep seeing…", "Worth knowing…", or similar. If there is genuinely no signal, say one short honest sentence about the quiet.`;

    const userMsg = `Context (JSON):\n${JSON.stringify(ctx, null, 2)}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error("AI reflection gateway error", res.status, t);
      if (res.status === 429) return Response.json({ thought: "Taking a breath. Try again in a moment." }, { headers: corsHeaders });
      if (res.status === 402) return Response.json({ thought: "AI credits are low — check workspace settings." }, { headers: corsHeaders });
      throw new Error(`gateway ${res.status}`);
    }

    const data = await res.json();
    const thought = (data.choices?.[0]?.message?.content ?? "").trim();

    return new Response(JSON.stringify({ thought, has_context: lifelogs.length + projects.length + sessions.length > 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("ai-reflection error:", msg);
    return new Response(JSON.stringify({ thought: "", error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
