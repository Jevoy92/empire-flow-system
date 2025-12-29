import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
}

interface SessionContext {
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

const SYSTEM_PROMPT = `You are a focused productivity assistant helping during an active work session. Your job is to help the user stay productive by managing their task list and providing brief encouragement.

CURRENT SESSION CONTEXT:
- Venture/Project: {venture}
- Work Type: {workType}
- Focus: {focus}
- Completion Condition: {completionCondition}
- Elapsed Time: {elapsedMinutes} minutes
{projectContext}
- Current Tasks:
{taskList}

YOUR CAPABILITIES:
You can take actions on the task list by including ACTION blocks in your response. Available actions:

1. ADD TASKS:
[ACTION]{"type":"add_tasks","tasks":["Task 1","Task 2"]}[/ACTION]

2. COMPLETE TASKS (by matching text, partial match OK):
[ACTION]{"type":"complete_tasks","matches":["task text to match"]}[/ACTION]

3. REMOVE TASKS:
[ACTION]{"type":"remove_tasks","matches":["task text to match"]}[/ACTION]

4. UPDATE TASK TEXT:
[ACTION]{"type":"update_task","match":"old text","newText":"new text"}[/ACTION]

GUIDELINES:
- Keep responses SHORT (1-2 sentences max)
- Be encouraging but not annoying or overly enthusiastic
- When adding tasks, make them specific and actionable
- If user says something is "done" or "finished", complete that task
- If user wants to add something, add it immediately
- Match task text loosely - partial matches are fine
- Don't ask permission to take action - just do it
- If user seems stuck or distracted, gently redirect to the next smallest step
- You can suggest without taking action if appropriate
{projectGuidelines}

EXAMPLES:
User: "add review the final cut"
You: "Added! ✓ [ACTION]{"type":"add_tasks","tasks":["Review the final cut"]}[/ACTION]"

User: "done with color correction"  
You: "Nice! Moving on 💪 [ACTION]{"type":"complete_tasks","matches":["color"]}[/ACTION]"

User: "I need to email Sarah about the deadline"
You: "Added to your list! [ACTION]{"type":"add_tasks","tasks":["Email Sarah about deadline"]}[/ACTION]"

User: "actually change that to call Sarah instead"
You: "Updated! [ACTION]{"type":"update_task","match":"Email Sarah","newText":"Call Sarah about deadline"}[/ACTION]"

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

    // Build task list for context
    const taskList = sessionContext.tasks.length > 0
      ? sessionContext.tasks.map((t, i) => 
          `  ${i + 1}. [${t.completed ? "✓" : " "}] ${t.text}`
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
      .replace("{projectGuidelines}", projectGuidelines);

    console.log("Session assistant request:", {
      messageCount: messages.length,
      taskCount: sessionContext.tasks.length,
      elapsedMinutes: sessionContext.elapsedMinutes,
      isProjectSession: sessionContext.isProjectSession,
      projectName: sessionContext.projectName,
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

    return new Response(response.body, {
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
