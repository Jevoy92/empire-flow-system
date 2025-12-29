import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ConversationRecord {
  role: string;
  content: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

interface UserInsights {
  preferences: Record<string, unknown>;
  patterns: Record<string, unknown>;
  recent_context: Record<string, unknown>;
}

const SYSTEM_PROMPT = `You are a helpful AI assistant embedded in a productivity app. You have MEMORY of past conversations and know the user's preferences.

YOUR CAPABILITIES:
- Remember past conversations and follow up on them
- Start work sessions
- Navigate the app
- Guide users on when to use Templates vs Projects
- Answer questions about their workflow

UNDERSTANDING TEMPLATES VS PROJECTS:

**TEMPLATES** = Recurring work sessions (do the same type of work regularly)
- Use for: daily routines, weekly content, regular meetings, ongoing maintenance
- Example: "I write a blog post every week" → Template

**PROJECTS** = Multi-stage deliverables (work through distinct phases to complete something)
- Use for: launches, campaigns, courses, videos, events, building things
- Example: "I'm creating a video series" → Project with stages: Planning → Filming → Editing → Publishing

When users describe complex, multi-phase work, guide them to create a PROJECT on the Workflows page.

KEY NAVIGATION:
- Home (/) - Start sessions, see suggestions
- History (/history) - View past sessions
- Workflows (/workflows) - Create and manage multi-stage PROJECTS
- Settings (/settings) - App preferences

CONTEXT AVAILABLE:
- Current page: {currentPage}
- Recent conversation history: {recentHistory}
- User preferences: {userPreferences}
- Pending follow-ups: {pendingFollowups}

RESPONSE STYLE:
- Keep responses SHORT and actionable (1-2 sentences max)
- Reference past conversations when relevant: "Last time you mentioned..."
- When users want to start a session, acknowledge and guide them
- When users describe complex work, ask if it's recurring or a multi-phase project
- When users ask about navigation, tell them how to get there
- Proactively follow up on things user mentioned but didn't complete`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context, history } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client for data access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    let recentConversations: ConversationRecord[] = [];
    let userInsights: UserInsights | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;

      if (userId) {
        // Fetch recent conversations for context
        const { data: conversations } = await supabase
          .from('ai_conversations')
          .select('role, content, created_at, metadata')
          .eq('user_id', userId)
          .eq('feature', 'command_center')
          .order('created_at', { ascending: false })
          .limit(10);

        recentConversations = (conversations || []).reverse();

        // Fetch user insights
        const { data: insights } = await supabase
          .from('ai_user_insights')
          .select('preferences, patterns, recent_context')
          .eq('user_id', userId)
          .single();

        userInsights = insights;
      }
    }

    // Build context strings for the prompt
    const recentHistoryText = recentConversations.length > 0
      ? recentConversations.slice(-5).map(c => `${c.role}: ${c.content}`).join('\n')
      : 'No previous conversations';

    const preferencesText = userInsights?.preferences 
      ? JSON.stringify(userInsights.preferences)
      : 'No preferences learned yet';

    const followupsText = userInsights?.recent_context?.pending_items
      ? JSON.stringify(userInsights.recent_context.pending_items)
      : 'No pending follow-ups';

    const systemPrompt = SYSTEM_PROMPT
      .replace('{currentPage}', context?.currentPage || '/')
      .replace('{recentHistory}', recentHistoryText)
      .replace('{userPreferences}', preferencesText)
      .replace('{pendingFollowups}', followupsText);

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((m: Message) => ({ role: m.role, content: m.content })),
      { role: "user", content: message }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: 250,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          response: "I'm a bit busy right now. Try again in a moment." 
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          response: "AI credits are low. Check your workspace settings." 
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || "I'm here to help!";

    // Save conversation to database if we have a user
    if (userId) {
      // Save user message
      await supabase.from('ai_conversations').insert({
        user_id: userId,
        feature: 'command_center',
        role: 'user',
        content: message,
        metadata: { page: context?.currentPage },
      });

      // Save assistant response
      await supabase.from('ai_conversations').insert({
        user_id: userId,
        feature: 'command_center',
        role: 'assistant',
        content: assistantMessage,
        metadata: {},
      });

      // Update recent context with any detected pending items
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes('later') || lowerMessage.includes('tomorrow') || lowerMessage.includes('remind')) {
        const currentContext = userInsights?.recent_context || {};
        const pendingItems = Array.isArray(currentContext.pending_items) ? currentContext.pending_items : [];
        pendingItems.push({
          text: message,
          mentioned_at: new Date().toISOString(),
        });

        await supabase.from('ai_user_insights').upsert({
          user_id: userId,
          recent_context: { ...currentContext, pending_items: pendingItems.slice(-5) },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      }
    }

    // Parse for potential actions
    let action = null;
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('go to history') || lowerMessage.includes('show history')) {
      action = { type: 'navigate', payload: { path: '/history' } };
    } else if (lowerMessage.includes('go to workflows') || lowerMessage.includes('show workflows') || lowerMessage.includes('go to projects') || lowerMessage.includes('show projects')) {
      action = { type: 'navigate', payload: { path: '/workflows' } };
    } else if (lowerMessage.includes('go to settings') || lowerMessage.includes('show settings')) {
      action = { type: 'navigate', payload: { path: '/settings' } };
    } else if (lowerMessage.includes('go home') || lowerMessage.includes('go to home')) {
      action = { type: 'navigate', payload: { path: '/' } };
    } else if (lowerMessage.includes('create project') || lowerMessage.includes('new project') || lowerMessage.includes('start a project')) {
      action = { type: 'navigate', payload: { path: '/workflows' } };
    }

    return new Response(JSON.stringify({ 
      response: assistantMessage,
      action 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("AI Command Center error:", error);
    return new Response(JSON.stringify({ 
      response: "Something went wrong. Try using the quick actions below.",
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
