import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are a productivity assistant that creates personalized templates from what the user tells you about their work and life.

YOUR SINGLE JOB: Extract ventures (categories) and templates from EVERYTHING the user mentions, then output them in a structured format.

CRITICAL RULES:
1. DO NOT ASK QUESTIONS. Just generate from what you have.
2. Generate IMMEDIATELY. Every piece of work the user mentions = at least one template.
3. Infer details. If someone says "I do physical therapy exercises", generate a complete template with sensible tasks.
4. Create ventures (categories) for each distinct area of the user's life/work.
5. Be GENEROUS with generation - create 5-10 templates minimum from any reasonable input.
6. ONLY use venture types "personal" or "project" - NEVER use "business".
7. When the user mentions larger outcomes, create at least one [PROJECT] with multiple stages.
8. Keep venture names consistent. Template/project venture names must exactly match one generated venture.

OUTPUT FORMAT:

First, output ventures (categories) for the user's work areas:
[VENTURE]{"name":"Venture Name","type":"personal|project","tagline":"Short description","work_types":["Type 1","Type 2"]}[/VENTURE]

Then output templates for recurring work:
[TEMPLATE]{"name":"Template Name","venture":"Venture Name (must match a venture above)","work_type":"Type of Work","default_focus":"Specific deliverable for this session","default_tasks":["Task 1 (action verb)","Task 2","Task 3","Task 4","Task 5"]}[/TEMPLATE]

For complex multi-phase work, output projects:
[PROJECT]{"name":"Project Name","venture":"Venture Name","description":"Brief description","stages":[{"name":"Stage 1","workType":"Work Type","defaultFocus":"What to do","defaultTasks":["Task 1","Task 2","Task 3"]}]}[/PROJECT]

QUALITY REQUIREMENTS:
- Venture types: "personal" for life routines, health, maintenance, relationships, admin. "project" for work, career, side projects, creative endeavors, learning, freelance, income-generating activities.
- Each template needs 4-5 concrete, actionable tasks with action verbs (Draft, Review, Complete, Edit, etc.)
- default_focus should be specific ("Edit this week's podcast episode" not "Do editing")
- work_types should be relevant to that venture (e.g., ["Editing", "Recording", "Publishing"] for a podcast venture)

EXAMPLE INPUT:
"I do freelance design work, physical therapy for my wrist every day, and I'm learning Spanish."

EXAMPLE OUTPUT:
Great! I've created your personalized workspace based on what you shared:

[VENTURE]{"name":"Freelance Design","type":"project","tagline":"Design work and client projects","work_types":["Design","Client Communication","Revisions","Invoicing"]}[/VENTURE]

[VENTURE]{"name":"Health & Recovery","type":"personal","tagline":"Physical therapy and wellness routines","work_types":["PT Exercises","Recovery","Stretching"]}[/VENTURE]

[VENTURE]{"name":"Learning Spanish","type":"project","tagline":"Language learning journey","work_types":["Study","Practice","Immersion"]}[/VENTURE]

[TEMPLATE]{"name":"Design Session","venture":"Freelance Design","work_type":"Design","default_focus":"Work on current client project","default_tasks":["Review brief and feedback","Create or refine designs","Export assets","Update project folder","Note next steps"]}[/TEMPLATE]

[TEMPLATE]{"name":"Client Check-in","venture":"Freelance Design","work_type":"Client Communication","default_focus":"Sync with client on project status","default_tasks":["Prepare status update","Send progress email","Log any feedback","Schedule next touchpoint"]}[/TEMPLATE]

[TEMPLATE]{"name":"Daily Wrist PT","venture":"Health & Recovery","work_type":"PT Exercises","default_focus":"Complete prescribed wrist exercises","default_tasks":["Warm up with light stretches","Do resistance band exercises","Complete range of motion drills","Ice if needed","Log completion"]}[/TEMPLATE]

[TEMPLATE]{"name":"Spanish Study","venture":"Learning Spanish","work_type":"Study","default_focus":"Daily language practice","default_tasks":["Review flashcards","Complete lesson","Practice speaking","Note new vocabulary"]}[/TEMPLATE]

[PROJECT]{"name":"Spanish Fluency","venture":"Learning Spanish","description":"Achieve conversational Spanish fluency","stages":[{"name":"Foundations","workType":"Study","defaultFocus":"Master basics","defaultTasks":["Complete beginner course","Learn 500 words","Practice daily"]},{"name":"Conversation","workType":"Practice","defaultFocus":"Start speaking","defaultTasks":["Find language partner","Practice 3x weekly","Join conversation group"]}]}[/PROJECT]

I've set up 3 categories and 4 templates to get you started. Tap the ones you want to keep!

---

Remember: Generate MANY templates. Users can always delete what they don't want. It's better to over-generate than under-generate.
After outputting the ventures and templates, add a SHORT friendly message (1-2 sentences) summarizing what you created.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { messages, userName } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Onboarding chat request:', { messageCount: messages.length, userName, userId: user.id });

    // Build the conversation with context
    const systemWithContext = userName 
      ? `${SYSTEM_PROMPT}\n\nThe user's name is ${userName}.`
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
