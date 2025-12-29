import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch user data in parallel
    const [sessionsRes, templatesRes, projectsRes, statsRes] = await Promise.all([
      supabase
        .from('sessions')
        .select('venture, work_type, focus, started_at, status')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(20), // Increased to detect patterns
      supabase
        .from('templates')
        .select('name, venture, work_type, last_used_at')
        .eq('user_id', user.id)
        .order('last_used_at', { ascending: false, nullsFirst: false })
        .limit(10),
      supabase
        .from('projects')
        .select('id, name, venture, status, current_stage, stages')
        .eq('user_id', user.id)
        .in('status', ['active', 'paused'])
        .order('updated_at', { ascending: false })
        .limit(5),
      supabase
        .from('user_stats')
        .select('current_streak, total_sessions_completed, unique_categories_used')
        .eq('id', user.id)
        .maybeSingle(),
    ]);

    const sessions = sessionsRes.data || [];
    const templates = templatesRes.data || [];
    const projects = (projectsRes.data || []).map(p => ({
      ...p,
      stages: Array.isArray(p.stages) ? p.stages : [],
    }));
    const stats = statsRes.data;

    // Analyze work patterns
    const workTypeCount: Record<string, number> = {};
    sessions.forEach(s => {
      workTypeCount[s.work_type] = (workTypeCount[s.work_type] || 0) + 1;
    });
    const repeatedWorkTypes = Object.entries(workTypeCount)
      .filter(([_, count]) => count >= 3)
      .map(([type]) => type);

    // Get current time context
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

    // Build context for AI
    const contextParts: string[] = [];
    contextParts.push(`Current time: ${timeOfDay} on ${dayOfWeek}`);
    
    if (stats) {
      contextParts.push(`User has completed ${stats.total_sessions_completed} total sessions`);
      contextParts.push(`Current streak: ${stats.current_streak} days`);
    }

    if (sessions.length > 0) {
      const recentVentures = [...new Set(sessions.slice(0, 5).map(s => s.venture))];
      contextParts.push(`Recent work categories: ${recentVentures.join(', ')}`);
      
      const lastSession = sessions[0];
      const lastSessionDate = new Date(lastSession.started_at);
      const daysSinceLastSession = Math.floor((now.getTime() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24));
      contextParts.push(`Last session was ${daysSinceLastSession} day(s) ago on ${lastSession.venture} - ${lastSession.work_type}`);
    }

    // Detect if user might benefit from projects
    if (projects.length === 0 && templates.length > 0 && repeatedWorkTypes.length > 0) {
      contextParts.push(`PATTERN DETECTED: User has ${templates.length} templates but no projects. They've done ${repeatedWorkTypes.join(', ')} work types 3+ times. Consider suggesting they create a project to track multi-phase work.`);
    }

    if (templates.length > 0) {
      const unusedTemplates = templates.filter(t => {
        if (!t.last_used_at) return true;
        const daysSinceUsed = Math.floor((now.getTime() - new Date(t.last_used_at).getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceUsed > 5;
      });
      if (unusedTemplates.length > 0) {
        contextParts.push(`Unused templates: ${unusedTemplates.map(t => t.name).join(', ')}`);
      }
    }

    if (projects.length > 0) {
      const activeProjects = projects.filter(p => p.status === 'active');
      activeProjects.forEach(p => {
        const currentStage = p.stages[p.current_stage];
        if (currentStage) {
          contextParts.push(`Active project "${p.name}" is on stage "${currentStage.name}" (${p.current_stage + 1}/${p.stages.length})`);
        }
      });
    }

    // Generate suggestions with AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ suggestions: getDefaultSuggestions(projects, templates, timeOfDay, projects.length === 0 && templates.length > 2) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are a productivity assistant that suggests personalized quick actions based on user context.

Generate 4-6 suggestions in JSON format. Each suggestion must have:
- label: Short action text (2-5 words)
- description: One sentence explanation
- type: One of "project", "template", "session", "routine", "create_project"
- data: Object with relevant IDs or config

Priority order:
1. Active projects that need continuation (type: "project", data: { projectId: "...", stageIndex: number })
2. If user has templates but no projects AND has worked on similar things 3+ times, suggest creating a project (type: "create_project")
3. Time-appropriate routines (morning routine in morning, shutdown in evening)
4. Recently used templates that match current context
5. Ventures/categories not worked on recently
6. General productivity actions

NEW SUGGESTION TYPE - Use when user might benefit from projects:
{
  "label": "Create a project",
  "description": "Track your [work type] work through stages for better progress",
  "type": "create_project",
  "data": { "suggestedVenture": "...", "suggestedWorkType": "..." }
}

Be creative with labels - don't just say "Continue X", use action verbs like "Shoot video for...", "Edit...", "Plan..."`;

    const userPrompt = `User context:
${contextParts.join('\n')}

Available templates: ${templates.map(t => `${t.name} (${t.venture})`).join(', ') || 'None'}
Active projects: ${projects.filter(p => p.status === 'active').length}

Generate personalized suggestions based on this context.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'return_suggestions',
              description: 'Return the list of suggestions',
              parameters: {
                type: 'object',
                properties: {
                  suggestions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        label: { type: 'string' },
                        description: { type: 'string' },
                        type: { type: 'string', enum: ['project', 'template', 'session', 'routine', 'create_project'] },
                        data: { type: 'object' },
                      },
                      required: ['label', 'description', 'type', 'data'],
                    },
                  },
                },
                required: ['suggestions'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'return_suggestions' } },
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI API error:', aiResponse.status);
      return new Response(JSON.stringify({ suggestions: getDefaultSuggestions(projects, templates, timeOfDay, projects.length === 0 && templates.length > 2) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ suggestions: parsed.suggestions }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ suggestions: getDefaultSuggestions(projects, templates, timeOfDay, projects.length === 0 && templates.length > 2) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in smart-suggestions:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getDefaultSuggestions(projects: any[], templates: any[], timeOfDay: string, suggestProject: boolean) {
  const suggestions: any[] = [];

  // Add active project suggestions first
  projects.forEach(p => {
    if (p.status === 'active' && p.stages[p.current_stage]) {
      suggestions.push({
        label: `Continue ${p.name}`,
        description: `Resume ${p.stages[p.current_stage].name} stage`,
        type: 'project',
        data: { projectId: p.id, stageIndex: p.current_stage },
      });
    }
  });

  // Suggest creating a project if user has templates but no projects
  if (suggestProject) {
    suggestions.push({
      label: 'Create a project',
      description: 'Track multi-phase work with stages for better progress',
      type: 'create_project',
      data: {},
    });
  }

  // Time-based routine
  if (timeOfDay === 'morning') {
    suggestions.push({
      label: 'Start your morning',
      description: 'Begin the day with your morning routine',
      type: 'routine',
      data: { venture: 'daily-maintenance', workType: 'Morning Routine' },
    });
  } else if (timeOfDay === 'evening') {
    suggestions.push({
      label: 'Evening shutdown',
      description: 'Close out the day properly',
      type: 'routine',
      data: { venture: 'daily-maintenance', workType: 'Evening Shutdown' },
    });
  }

  // Add template suggestion
  if (templates.length > 0) {
    const template = templates[0];
    suggestions.push({
      label: `Quick start: ${template.name}`,
      description: `Use your ${template.venture} template`,
      type: 'template',
      data: { templateId: template.id },
    });
  }

  // Generic start session
  suggestions.push({
    label: 'Start a work session',
    description: 'Begin a new focused work session',
    type: 'session',
    data: {},
  });

  return suggestions.slice(0, 6);
}
