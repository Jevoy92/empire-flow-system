import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
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

    const { name, projects, workTypes, challenges } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Generating templates for user:', user.id, { name, projects, workTypes, challenges });

    const systemPrompt = `You are a productivity expert helping users create personalized work session templates. 
Based on the user's information, generate 5-8 highly relevant work templates that match their projects and work style.
Each template should be practical, actionable, and help them stay focused.`;

    const userPrompt = `Create personalized work session templates for this user:

Name: ${name}
Projects/Areas: ${projects}
Types of work they do: ${workTypes}
Focus challenges: ${challenges}

Generate 5-8 templates. For each template, provide:
1. A clear, specific name
2. The venture/project area it belongs to
3. The type of work
4. A default focus statement (what to concentrate on)
5. 3-5 practical default tasks

Return ONLY a valid JSON object in this exact format, no markdown or explanation:
{
  "templates": [
    {
      "name": "Template Name",
      "venture": "Project/Area Name",
      "work_type": "Type of Work",
      "default_focus": "What to focus on during this session",
      "default_tasks": ["Task 1", "Task 2", "Task 3"]
    }
  ]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
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

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI response:', content);

    // Parse the JSON response
    let templates;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        templates = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Return default templates if parsing fails
      templates = {
        templates: [
          {
            name: "Deep Work Session",
            venture: "General",
            work_type: "Focused Work",
            default_focus: "Complete one important task with full concentration",
            default_tasks: ["Identify the main task", "Remove distractions", "Work in focused blocks", "Review progress"]
          },
          {
            name: "Planning & Review",
            venture: "General",
            work_type: "Planning",
            default_focus: "Plan and organize upcoming work",
            default_tasks: ["Review completed items", "Identify priorities", "Schedule time blocks", "Set clear goals"]
          },
          {
            name: "Communication Batch",
            venture: "General",
            work_type: "Communication",
            default_focus: "Handle all messages and correspondence",
            default_tasks: ["Clear inbox", "Respond to urgent items", "Schedule follow-ups", "Update stakeholders"]
          }
        ]
      };
    }

    console.log('Returning templates:', templates);

    return new Response(JSON.stringify(templates), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-templates function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      templates: [] 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
