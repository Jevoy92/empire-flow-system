import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface Task {
  id: string;
  text: string;
  completed: boolean;
  timerDurationSeconds?: number;
  timerRemainingSeconds?: number;
  timerStatus?: 'idle' | 'running' | 'paused' | 'done';
  timerCompletedAt?: string | null;
}

interface SessionContext {
  sessionId?: string;
  venture: string;
  workType: string;
  focus: string;
  completionCondition: string;
  tasks: Task[];
  elapsedMinutes: number;
  // Project context (optional - only present if session is part of a project)
  projectName?: string;
  currentStageName?: string;
  stageProgress?: string; // e.g., "2 of 4"
  nextStageName?: string;
  isProjectSession?: boolean;
}

interface ConversationRecord {
  content: string;
  metadata?: { workType?: string };
}

const SYSTEM_PROMPT = `You are a focused productivity assistant helping during an active work session. Your job is to help the user stay productive by managing their task list and providing brief encouragement.

You have MEMORY of past sessions and can reference what worked before.

CURRENT SESSION CONTEXT:
- Venture/Project: {venture}
- Work Type: {workType}
- Focus: {focus}
- Completion Condition: {completionCondition}
- Elapsed Time: {elapsedMinutes} minutes
{projectContext}
- Current Tasks:
{taskList}

PAST SESSION INSIGHTS:
{pastInsights}

YOUR CAPABILITIES:
You can take actions on the task list by including ACTION blocks in your response. Available actions:

1. ADD TASKS:
[ACTION]{"type":"add_tasks","tasks":["Task 1","Task 2"]}[/ACTION]

1b. ADD TASKS WITH SUBTASKS:
[ACTION]{"type":"add_task_tree","tasks":[{"text":"Design homepage","subtasks":["Define layout","Create first draft","Review spacing"]},{"text":"Write hero copy","subtasks":["Draft headline","Draft subheadline","Polish CTA"]}]}[/ACTION]

2. COMPLETE TASKS (by matching text, partial match OK):
[ACTION]{"type":"complete_tasks","matches":["task text to match"]}[/ACTION]

3. REMOVE TASKS:
[ACTION]{"type":"remove_tasks","matches":["task text to match"]}[/ACTION]

4. UPDATE TASK TEXT:
[ACTION]{"type":"update_task","match":"old text","newText":"new text"}[/ACTION]

5. SET A TASK TIMER (minutes):
[ACTION]{"type":"set_task_timer","match":"task text","minutes":25,"autoStart":true}[/ACTION]

6. START TASK TIMERS (specific matches or all when omitted):
[ACTION]{"type":"start_task_timers","matches":["outline","editing"]}[/ACTION]
[ACTION]{"type":"start_task_timers"}[/ACTION]

7. PAUSE TASK TIMERS:
[ACTION]{"type":"pause_task_timers","matches":["editing"]}[/ACTION]
[ACTION]{"type":"pause_task_timers"}[/ACTION]

GUIDELINES:
- Keep responses SHORT (1-2 sentences max)
- Reference past sessions when relevant: "Last time you did X, you found Y helpful"
- Be encouraging but not annoying or overly enthusiastic
- When adding tasks, make them specific and actionable
- If user says something is "done" or "finished", complete that task
- If user wants to add something, add it immediately
- Prefer "add_task_tree" when the user asks for a plan, breakdown, roadmap, or steps
- Match task text loosely - partial matches are fine
- If user gives durations ("25 minutes", "15m"), set timers for those tasks
- If user asks to run multiple timed tasks, set timers and start them
- Don't ask permission to take action - just do it
- If user seems stuck or distracted, gently redirect to the next smallest step
- Track patterns: if user mentions something worked well or was hard, acknowledge it
{projectGuidelines}

EXAMPLES:
User: "add review the final cut"
You: "Added! ✓ [ACTION]{"type":"add_tasks","tasks":["Review the final cut"]}[/ACTION]"

User: "done with color correction"  
You: "Nice! Moving on 💪 [ACTION]{"type":"complete_tasks","matches":["color"]}[/ACTION]"

User: "I need to email Sarah about the deadline"
You: "Added to your list! [ACTION]{"type":"add_tasks","tasks":["Email Sarah about deadline"]}[/ACTION]"

User: "Break this into tasks and subtasks for launching the homepage"
You: "Planned it out. [ACTION]{"type":"add_task_tree","tasks":[{"text":"Finalize homepage scope","subtasks":["Confirm audience and offer","Define success criteria","List required assets"]},{"text":"Build homepage draft","subtasks":["Create layout sections","Write initial copy","Add visuals"]},{"text":"Review and publish homepage","subtasks":["QA mobile and desktop","Fix issues","Publish and verify live"]}]}[/ACTION]"

User: "actually change that to call Sarah instead"
You: "Updated! [ACTION]{"type":"update_task","match":"Email Sarah","newText":"Call Sarah about deadline"}[/ACTION]"

User: "set 25 minutes for draft homepage and start it"
You: "Timer set and running. [ACTION]{"type":"set_task_timer","match":"draft homepage","minutes":25,"autoStart":true}[/ACTION]"

User: "start timers for outline and rough edit"
You: "Running both timers now. [ACTION]{"type":"start_task_timers","matches":["outline","rough edit"]}[/ACTION]"

User: "I'm getting distracted"
You: "Happens to everyone. What's the smallest next step you can take right now?"`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, sessionContext } = await req.json() as {
      messages: Message[];
      sessionContext: SessionContext;
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client for memory
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    let pastInsights = 'No previous session data';

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;

      if (userId) {
        // Fetch past conversations for similar work types
        const { data: pastConversations } = await supabase
          .from('ai_conversations')
          .select('content, metadata')
          .eq('user_id', userId)
          .eq('feature', 'session_assistant')
          .order('created_at', { ascending: false })
          .limit(30);

        // Filter for relevant past insights from similar work
        if (pastConversations && pastConversations.length > 0) {
          const relevantConvos = pastConversations.filter((c: ConversationRecord) => {
            return c.metadata?.workType === sessionContext?.workType;
          }).slice(0, 5);

          if (relevantConvos.length > 0) {
            pastInsights = `From past ${sessionContext?.workType} sessions:\n` + 
              relevantConvos.map((c: ConversationRecord) => `- ${c.content.slice(0, 80)}...`).join('\n');
          }
        }
      }
    }

    // Build task list for context
    const taskList = sessionContext.tasks.length > 0
      ? sessionContext.tasks.map((t, i) => 
          `  ${i + 1}. [${t.completed ? "✓" : " "}] ${t.text}${
            typeof t.timerRemainingSeconds === 'number'
              ? ` (timer: ${t.timerRemainingSeconds}s, status: ${t.timerStatus || 'idle'})`
              : ''
          }`
        ).join("\n")
      : "  (no tasks yet)";

    // Build project context if this is a project session
    let projectContext = "";
    let projectGuidelines = "";
    
    if (sessionContext.isProjectSession && sessionContext.projectName) {
      projectContext = `
- THIS IS A PROJECT SESSION
- Project: ${sessionContext.projectName}
- Current Stage: ${sessionContext.currentStageName || 'Unknown'}
- Progress: Stage ${sessionContext.stageProgress || '?'}${sessionContext.nextStageName ? `\n- Next Stage: ${sessionContext.nextStageName}` : ' (final stage!)'}`;

      projectGuidelines = `
- This is part of a larger project - remind user of their progress when appropriate
- When all tasks are done, mention they're ready to move to the next stage (or celebrate if it's the final stage!)
- If user asks "what's next after this?", tell them about the next stage: ${sessionContext.nextStageName || 'This is the final stage!'}`;
    }

    // Build system prompt with context
    const systemPrompt = SYSTEM_PROMPT
      .replace("{venture}", sessionContext.venture)
      .replace("{workType}", sessionContext.workType)
      .replace("{focus}", sessionContext.focus)
      .replace("{completionCondition}", sessionContext.completionCondition)
      .replace("{elapsedMinutes}", String(sessionContext.elapsedMinutes))
      .replace("{projectContext}", projectContext)
      .replace("{taskList}", taskList)
      .replace("{pastInsights}", pastInsights)
      .replace("{projectGuidelines}", projectGuidelines);

    console.log("Session assistant request:", {
      messageCount: messages.length,
      taskCount: sessionContext.tasks.length,
      elapsedMinutes: sessionContext.elapsedMinutes,
      isProjectSession: sessionContext.isProjectSession,
      projectName: sessionContext.projectName,
      hasPastInsights: pastInsights !== 'No previous session data',
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "API credits depleted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    // Save user message to conversation history
    const lastUserMessage = messages?.[messages.length - 1];
    if (userId && lastUserMessage?.role === 'user') {
      await supabase.from('ai_conversations').insert({
        user_id: userId,
        feature: 'session_assistant',
        role: 'user',
        content: lastUserMessage.content,
        metadata: {
          sessionId: sessionContext.sessionId,
          workType: sessionContext.workType,
          venture: sessionContext.venture,
          projectName: sessionContext.projectName,
        },
      });
    }

    // Stream the response and collect for saving
    const reader = response.body?.getReader();
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        const decoder = new TextDecoder();
        
        try {
          while (true) {
            const { done, value } = await reader!.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            controller.enqueue(value);
            
            // Parse SSE to collect full response
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) fullResponse += content;
                } catch {
                  // Skip invalid JSON
                }
              }
            }
          }
          
          // Save assistant response after streaming completes
          if (userId && fullResponse) {
            await supabase.from('ai_conversations').insert({
              user_id: userId,
              feature: 'session_assistant',
              role: 'assistant',
              content: fullResponse,
              metadata: {
                sessionId: sessionContext.sessionId,
                workType: sessionContext.workType,
              },
            });
          }
          
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Session assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
