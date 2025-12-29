import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SessionData {
  sessionId: string;
  focus: string;
  workType: string;
  venture: string;
  durationMinutes: number;
  tasksCompleted: number;
  totalTasks: number;
  projectName?: string;
  stageName?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionData } = await req.json() as { sessionData: SessionData };
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch conversation history for this session
    const { data: conversations } = await supabase
      .from('ai_conversations')
      .select('role, content')
      .eq('user_id', user.id)
      .eq('feature', 'session_assistant')
      .order('created_at', { ascending: false })
      .limit(20);

    // Filter conversations for this session (by sessionId in metadata would be ideal)
    const sessionConversations = conversations || [];

    // Fetch current user insights
    const { data: currentInsights } = await supabase
      .from('ai_user_insights')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Build analysis prompt
    const conversationText = sessionConversations
      .reverse()
      .map((c: { role: string; content: string }) => `${c.role}: ${c.content}`)
      .join('\n');

    const analysisPrompt = `Analyze this work session and extract key insights:

SESSION INFO:
- Focus: ${sessionData.focus}
- Work Type: ${sessionData.workType}
- Category: ${sessionData.venture}
- Duration: ${sessionData.durationMinutes} minutes
- Tasks: ${sessionData.tasksCompleted}/${sessionData.totalTasks} completed
${sessionData.projectName ? `- Project: ${sessionData.projectName}` : ''}
${sessionData.stageName ? `- Stage: ${sessionData.stageName}` : ''}

CONVERSATION DURING SESSION:
${conversationText || 'No conversation recorded'}

Extract and return as JSON:
{
  "productivity_score": 1-10,
  "what_went_well": "brief summary",
  "challenges": "brief summary or null",
  "preferred_work_patterns": ["pattern1", "pattern2"],
  "suggested_improvements": "one actionable suggestion"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You analyze work sessions and extract actionable insights. Always respond with valid JSON." },
          { role: "user", content: analysisPrompt },
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.error("AI analysis error:", response.status);
      // Continue without AI analysis
      return new Response(JSON.stringify({ success: true, aiAnalysis: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const analysisText = data.choices?.[0]?.message?.content || '';

    // Try to parse the AI response as JSON
    let analysis = null;
    try {
      // Extract JSON from response (might be wrapped in markdown code blocks)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error('Failed to parse AI analysis:', analysisText);
    }

    // Update user insights with new patterns
    if (analysis) {
      const currentPatterns = currentInsights?.patterns || {};
      const currentPreferences = currentInsights?.preferences || {};

      // Merge new patterns
      const updatedPatterns = {
        ...currentPatterns,
        last_session_score: analysis.productivity_score,
        recent_challenges: analysis.challenges,
        work_patterns: [
          ...(currentPatterns.work_patterns || []),
          ...(analysis.preferred_work_patterns || []),
        ].slice(-10), // Keep last 10 patterns
      };

      // Update preferences based on consistent patterns
      const patternCounts: Record<string, number> = {};
      (updatedPatterns.work_patterns || []).forEach((p: string) => {
        patternCounts[p] = (patternCounts[p] || 0) + 1;
      });

      const consistentPatterns = Object.entries(patternCounts)
        .filter(([, count]) => count >= 3)
        .map(([pattern]) => pattern);

      const updatedPreferences = {
        ...currentPreferences,
        consistent_patterns: consistentPatterns,
      };

      await supabase.from('ai_user_insights').upsert({
        user_id: user.id,
        patterns: updatedPatterns,
        preferences: updatedPreferences,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      analysis,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Session summary error:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
