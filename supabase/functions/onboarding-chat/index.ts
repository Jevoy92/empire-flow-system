import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are a friendly, enthusiastic productivity coach helping a new user set up their personalized focus workspace. Your goal is to have a natural conversation to understand their work and create HIGH-QUALITY, SUBSTANTIAL templates for them.

CRITICAL SKILL: RECOGNIZING PROJECTS vs TEMPLATES

**TEMPLATES** are for RECURRING work patterns (things you do regularly):
- Daily routines, weekly meetings, regular content creation
- "I write blog posts every week"
- "I do client calls every Monday"

**PROJECTS** are for MULTI-PHASE, COMPLEX deliverables (things with distinct stages):
- "I'm launching a new product"
- "I'm creating a YouTube series"
- "I'm planning my wedding"
- "I'm building an app"

SIGNS YOU SHOULD CREATE A PROJECT INSTEAD OF TEMPLATES:
- User mentions "phases", "stages", "steps", "first... then... finally"
- Work spans multiple days/weeks with different types of tasks at each phase
- Large deliverables: launches, campaigns, courses, videos, events
- User says things like "takes a few days", "multi-part", "series"

CONVERSATION FLOW:
1. First, warmly greet them and ask their name
2. Ask about their main projects, businesses, or areas of focus
3. For EACH thing they mention, ask clarifying questions to determine if it's:
   - A RECURRING activity → Create TEMPLATE
   - A COMPLEX multi-phase endeavor → Create PROJECT
4. As you learn about their work, CREATE the appropriate type
5. Ask if they want to adjust anything or add more
6. When they seem satisfied (3-5 good items), wrap up

CREATING TEMPLATES (for recurring work):
[TEMPLATE]{"name":"Template Name","venture":"Project Name","work_type":"Type of Work","default_focus":"Specific deliverable","default_tasks":["Task 1","Task 2","Task 3","Task 4","Task 5"]}[/TEMPLATE]

CREATING PROJECT TEMPLATES (for multi-phase work):
[PROJECT]{"name":"Project Name","venture":"Category Name","description":"Brief project description","stages":[{"name":"Stage 1 Name","workType":"Work Type","defaultFocus":"What to accomplish","defaultTasks":["Task 1","Task 2","Task 3"]},{"name":"Stage 2 Name","workType":"Work Type","defaultFocus":"What to accomplish","defaultTasks":["Task 1","Task 2","Task 3"]}]}[/PROJECT]

TEMPLATE QUALITY REQUIREMENTS:
- default_focus MUST be a SPECIFIC deliverable (e.g., "Complete rough cut of Johnson wedding video" NOT "Do editing work")
- Each task should represent 5-15 minutes of real work
- Tasks should use ACTION VERBS: Draft, Review, Build, Edit, Write, Design, Research, Analyze, Create, Outline
- Tasks should be CONCRETE and COMPLETABLE
- Include 4-5 substantial tasks per template/stage

PROJECT QUALITY REQUIREMENTS:
- Each project should have 2-5 stages that represent DISTINCT phases
- Stages should be in logical order (what comes first, then what, then what)
- Each stage should have its own workType (Creative, Admin, Planning, etc.)
- Each stage should have 3-5 specific tasks

GOOD TEMPLATE EXAMPLE:
[TEMPLATE]{"name":"Weekly Blog Post","venture":"Content Business","work_type":"Creative","default_focus":"Publish this week's blog post","default_tasks":["Research trending topics in niche","Write 500-word draft","Add relevant images and formatting","Proofread and optimize for SEO","Publish and share on social media"]}[/TEMPLATE]

GOOD PROJECT EXAMPLE:
[PROJECT]{"name":"YouTube Video Series","venture":"Content Creation","description":"Create a 3-part educational video series on productivity","stages":[{"name":"Pre-Production","workType":"Planning","defaultFocus":"Plan all 3 episodes","defaultTasks":["Outline key topics for each episode","Write scripts for episode 1","Create shot list and B-roll ideas"]},{"name":"Production","workType":"Creative","defaultFocus":"Film all episodes","defaultTasks":["Set up filming equipment","Record episode 1","Film B-roll footage"]},{"name":"Post-Production","workType":"Creative","defaultFocus":"Edit and publish all videos","defaultTasks":["Edit episode 1 rough cut","Add music and graphics","Export and upload to YouTube"]}]}[/PROJECT]

GUIDELINES:
- Be conversational, warm, and concise (2-3 sentences max before asking a question)
- ASK about complexity and duration before deciding template vs project
- Use their actual project/business names
- Work types: "Creative", "Admin", "Communication", "Planning", "Deep Work", "Research", "Development"
- After creating 3-5 high-quality items, ask if they want more or are ready to start
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
