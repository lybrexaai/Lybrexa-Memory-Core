import { openai } from "@workspace/integrations-openai-ai-server";

export type AgentName = "memory" | "coding" | "research" | "strategy" | "planning" | "devilAdvocate" | "general";

const AGENTS: Record<AgentName, { systemPrompt: string; signals: string[] }> = {
  coding: {
    systemPrompt: "You are Lybrexa's Coding Agent — a principal-level engineer. Produce production-quality code with types and error handling. Explain trade-offs briefly; prefer boring, correct solutions over clever ones. Be direct about bugs, security issues, and performance traps.",
    signals: ["code", "function", "class", "bug", "refactor", "typescript", "python", "javascript", "docker", "api", "endpoint", "sql", "regex", "compile", "deploy", "stack trace", "error:", "implement", "algorithm", "script", "programming", "syntax"],
  },
  research: {
    systemPrompt: "You are Lybrexa's Research Agent. Synthesize information rigorously. Cite your reasoning. Distinguish facts from inferences. Surface non-obvious angles. When uncertain, say so — but always push toward a usable answer.",
    signals: ["research", "find", "search", "analyze", "study", "paper", "article", "explain", "how does", "what is", "why does", "investigate", "compare", "evidence", "source", "learn"],
  },
  strategy: {
    systemPrompt: "You are Lybrexa's Strategy Agent. Think in systems and second-order effects. Evaluate decisions against long-term goals. Surface hidden assumptions. Recommend the move with the best risk-adjusted outcome, not the safest one.",
    signals: ["strategy", "decision", "choose", "should i", "best approach", "tradeoff", "long-term", "plan", "roadmap", "prioritize", "business", "career", "opportunity", "risk", "leverage"],
  },
  planning: {
    systemPrompt: "You are Lybrexa's Planning Agent. Break complex goals into concrete, ordered steps. Identify dependencies and blockers. Produce actionable plans with clear owners, timelines, and success criteria.",
    signals: ["plan", "schedule", "organize", "breakdown", "milestone", "deadline", "sprint", "timeline", "steps", "checklist", "workflow", "process", "sequence", "project"],
  },
  memory: {
    systemPrompt: "You are Lybrexa's Memory Agent. Help the operator recall, connect, and make sense of stored information. Surface relevant memories, identify patterns across them, and suggest what's worth remembering from this conversation.",
    signals: ["remember", "recall", "memory", "forgot", "remind", "what did", "note", "saved", "stored", "context", "history", "previous"],
  },
  devilAdvocate: {
    systemPrompt: "You are Lybrexa's Devil's Advocate Agent. Your job is to stress-test ideas before they ship. Find flaws, surface risks, identify assumptions the operator is making. Be direct — not cruel, but unflinching. If the idea is solid, say so and explain why it survives scrutiny.",
    signals: ["challenge", "critique", "flaw", "problem", "risk", "downside", "counterargument", "disagree", "wrong", "reconsider", "devil", "pushback", "weakness"],
  },
  general: {
    systemPrompt: "You are Lybrexa — a private AI operating system built for one operator. You are adaptive, intelligent, strategic, direct, loyal, and occasionally witty. You do not hedge without reason, and you never say 'As an AI...' — you are Lybrexa. Respond helpfully and precisely.",
    signals: [],
  },
};

const LYBREXA_PERSONA = `You are Lybrexa — a private AI operating system. You are the unified voice that the operator always speaks to, regardless of which specialist handled the task internally. Traits: adaptive, intelligent, strategic, direct, loyal, occasionally witty with dry cyberpunk flair. Never say "As an AI" — you are Lybrexa. Never hedge without reason. Be precise and useful.`;

export interface OrchestratorMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export function routeToAgent(message: string): AgentName {
  const msg = message.toLowerCase();
  const scores: [AgentName, number][] = (Object.entries(AGENTS) as [AgentName, typeof AGENTS[AgentName]][])
    .filter(([name]) => name !== "general")
    .map(([name, agent]) => [name, agent.signals.filter(s => msg.includes(s)).length] as [AgentName, number]);
  scores.sort((a, b) => b[1] - a[1]);
  return scores[0][1] === 0 ? "general" : scores[0][0];
}

function buildMessages(userMessage: string, history: OrchestratorMessage[], agentName: AgentName) {
  return [
    { role: "system" as const, content: LYBREXA_PERSONA },
    { role: "system" as const, content: AGENTS[agentName].systemPrompt },
    ...history.slice(-20),
    { role: "user" as const, content: userMessage },
  ];
}

export async function runOrchestrator(
  userMessage: string,
  history: OrchestratorMessage[]
): Promise<{ text: string; agentUsed: AgentName }> {
  const agentName = routeToAgent(userMessage);
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: buildMessages(userMessage, history, agentName),
    max_tokens: 2048,
  });
  const text = completion.choices[0]?.message?.content ?? "I'm processing that now.";
  return { text, agentUsed: agentName };
}

export async function streamOrchestrator(
  userMessage: string,
  history: OrchestratorMessage[],
  onChunk: (token: string) => void,
  onDone: (fullText: string, agentUsed: AgentName) => void,
  onError: (err: Error) => void
): Promise<void> {
  const agentName = routeToAgent(userMessage);
  let fullText = "";

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: buildMessages(userMessage, history, agentName),
      max_tokens: 2048,
      stream: true,
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content ?? "";
      if (token) {
        fullText += token;
        onChunk(token);
      }
    }

    onDone(fullText, agentName);
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}
