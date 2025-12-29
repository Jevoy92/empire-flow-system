import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are a helpful AI assistant embedded in a productivity app. Your job is to help users:
- Start work sessions
- Navigate the app
- Understand when to use Templates vs Projects
- Answer questions about their workflow
- Provide quick help

UNDERSTANDING TEMPLATES VS PROJECTS:

**TEMPLATES** = Recurring work sessions (do the same type of work regularly)
- Use for: daily routines, weekly content, regular meetings, ongoing maintenance
- Example: "I write a blog post every week" → Template

**PROJECTS** = Multi-stage deliverables (work through distinct phases to complete something)
- Use for: launches, campaigns, courses, videos, events, building things
- Example: "I'm creating a video series" → Project with stages: Planning → Filming → Editing → Publishing

When users describe work that sounds like it has multiple phases or will take several sessions to complete, guide them toward creating a PROJECT on the Workflows page, not just templates.

KEY NAVIGATION:
- Home (/) - Start sessions, see suggestions
- History (/history) - View past sessions
- Workflows (/workflows) - Create and manage multi-stage PROJECTS
- Settings (/settings) - App preferences

Current context:
- The user is on page: {currentPage}
- The app helps users run focused work sessions with timers and task lists
- Projects live on the Workflows page and track progress through stages

RESPONSE STYLE:
- Keep responses SHORT and actionable (1-2 sentences max)
- When users want to start a session, acknowledge and guide them
- When users describe complex work, ask if it's recurring or a multi-phase project
- When users ask about navigation, tell them how to get there
- Respond conversationally but stay brief`;

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

    const systemPrompt = SYSTEM_PROMPT
      .replace('{currentPage}', context?.currentPage || '/');

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
        max_tokens: 200,
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
