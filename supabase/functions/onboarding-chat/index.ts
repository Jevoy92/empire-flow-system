import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface TemplateData {
  name: string;
  venture: string;
  work_type: string;
  default_focus: string;
  default_tasks: string[];
}

const SYSTEM_PROMPT = `You are a friendly, enthusiastic productivity coach helping a new user set up their personalized focus workspace. Your goal is to have a natural conversation to understand their work and create custom templates for them.

CONVERSATION FLOW:
1. First, warmly greet them and ask their name
2. Ask about their main projects, businesses, or areas of focus
3. For each project they mention, dig deeper into what types of work they do
4. As you learn about their work, proactively CREATE TEMPLATES for them using the special format below
5. Ask if they want to adjust anything or add more templates
6. When they seem satisfied, wrap up and tell them they're ready to start

CRITICAL: When you want to create a template, you MUST include it in your response using this EXACT format:
[TEMPLATE]{"name":"Template Name","venture":"Project Name","work_type":"Type of Work","default_focus":"What to focus on","default_tasks":["Task 1","Task 2","Task 3"]}[/TEMPLATE]

You can include multiple templates in one message. Templates appear inline in your conversational response.

EXAMPLE RESPONSE:
"Nice! So you run a video production company. Let me create a template for your editing sessions:

[TEMPLATE]{"name":"Video Editing Session","venture":"Palmer House","work_type":"Creative Work","default_focus":"Complete a focused editing block","default_tasks":["Open project files","Review client notes","Set 25-min timer block","Disable notifications"]}[/TEMPLATE]

Does that look right? What other types of work do you do for Palmer House?"

GUIDELINES:
- Be conversational, warm, and concise (2-3 sentences max before asking a question)
- Create templates proactively as you learn about their work
- Each template should have 3-5 practical, actionable tasks
- Use their actual project/business names as ventures
- Suggest specific work types like "Creative", "Admin", "Communication", "Planning", "Deep Work"
- After creating 4-6 templates, ask if they want more or are ready to start
- Never ask more than one question at a time
- Use emoji sparingly (1-2 per message max)`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userName } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Onboarding chat request:', { messageCount: messages.length, userName });

    // Build the conversation with context
    const systemWithContext = userName 
      ? `${SYSTEM_PROMPT}\n\nThe user's name is ${userName}. You've already greeted them, so continue naturally.`
      : SYSTEM_PROMPT;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemWithContext },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    // Stream the response back
    return new Response(response.body, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in onboarding-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
