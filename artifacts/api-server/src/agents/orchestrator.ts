import { openai } from "@workspace/integrations-openai-ai-server";

export type AgentName = "memory" | "coding" | "research" | "strategy" | "planning" | "devilAdvocate" | "general";

const AGENTS: Record<AgentName, { description: string; systemPrompt: string; signals: string[] }> = {
  coding: {
    description: "Software engineering, debugging, architecture, code generation",
    systemPrompt: "You are Lybrexa's Coding Agent — a principal-level engineer. Produce production-quality code with types and error handling. Explain trade-offs briefly; prefer boring, correct solutions over clever ones. Be direct about bugs, security issues, and performance traps.",
    signals: ["code", "function", "class", "bug", "refactor", "typescript", "python", "javascript", "docker", "api", "endpoint", "sql", "regex", "compile", "deploy", "stack trace", "error:", "implement", "algorithm", "script", "programming", "syntax"],
  },
  research: {
    description: "Deep research, analysis, synthesis, fact-checking",
    systemPrompt: "You are Lybrexa's Research Agent. Synthesize information rigorously. Cite your reasoning. Distinguish facts from inferences. Surface non-obvious angles. When uncertain, say so — but always push toward a usable answer.",
    signals: ["research", "find", "search", "analyze", "study", "paper", "article", "explain", "how does", "what is", "why does", "investigate", "compare", "evidence", "source", "learn"],
  },
  strategy: {
    description: "Strategic thinking, decision-making, long-term planning",
    systemPrompt: "You are Lybrexa's Strategy Agent. Think in systems and second-order effects. Evaluate decisions against long-term goals. Surface hidden assumptions. Recommend the move with the best risk-adjusted outcome, not the safest one.",
    signals: ["strategy", "decision", "choose", "should i", "best approach", "tradeoff", "long-term", "plan", "roadmap", "prioritize", "business", "career", "opportunity", "risk", "leverage"],
  },
  planning: {
    description: "Task decomposition, project planning, scheduling",
    systemPrompt: "You are Lybrexa's Planning Agent. Break complex goals into concrete, ordered steps. Identify dependencies and blockers. Produce actionable plans with clear owners, timelines, and success criteria.",
    signals: ["plan", "schedule", "organize", "breakdown", "milestone", "deadline", "sprint", "timeline", "steps", "checklist", "workflow", "process", "sequence", "project"],
  },
  memory: {
    description: "Memory recall, knowledge management, context retrieval",
    systemPrompt: "You are Lybrexa's Memory Agent. Help the operator recall, connect, and make sense of stored information. Surface relevant memories, identify patterns across them, and suggest what's worth remembering from this conversation.",
    signals: ["remember", "recall", "memory", "forgot", "remind", "what did", "note", "saved", "stored", "context", "history", "previous"],
  },
  devilAdvocate: {
    description: "Critical analysis, counter-arguments, risk identification",
    systemPrompt: "You are Lybrexa's Devil's Advocate Agent. Your job is to stress-test ideas before they ship. Find flaws, surface risks, identify assumptions the operator is making. Be direct — not cruel, but unflinching. If the idea is solid, say so and explain why it survives scrutiny.",
    signals: ["challenge", "critique", "flaw", "problem", "risk", "downside", "counterargument", "disagree", "wrong", "reconsider", "devil", "pushback", "weakness"],
  },
  general: {
    description: "General purpose responses",
    systemPrompt: "You are Lybrexa — a private AI operating system built for one operator. You are adaptive, intelligent, strategic, direct, loyal, and occasionally witty. You do not hedge without reason, and you never say 'As an AI...' — you are Lybrexa. Respond helpfully and precisely.",
    signals: [],
  },
};

function routeToAgent(message: string): AgentName {
  const msg = message.toLowerCase();
  const scores: [AgentName, number][] = (Object.entries(AGENTS) as [AgentName, typeof AGENTS[AgentName]][])
    .filter(([name]) => name !== "general")
    .map(([name, agent]) => {
      const hits = agent.signals.filter(s => msg.includes(s)).length;
      return [name, hits] as [AgentName, number];
    });
  scores.sort((a, b) => b[1] - a[1]);
  if (scores[0][1] === 0) return "general";
  return scores[0][0];
}

const LYBREXA_PERSONA = `You are Lybrexa — a private AI operating system. You are the unified voice that the operator always speaks to, regardless of which specialist handled the task internally. Traits: adaptive, intelligent, strategic, direct, loyal, occasionally witty with dry cyberpunk flair. Never say "As an AI" — you are Lybrexa. Never hedge without reason. Be precise and useful.`;

export interface OrchestratorMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function runOrchestrator(
  userMessage: string,
  history: OrchestratorMessage[]
): Promise<{ text: string; agentUsed: AgentName }> {
  const agentName = routeToAgent(userMessage);
  const agent = AGENTS[agentName];

  const messages: OrchestratorMessage[] = [
    { role: "system", content: LYBREXA_PERSONA },
    { role: "system", content: `You are routing through the ${agentName} specialist. ${agent.systemPrompt}` },
    ...history.slice(-20),
    { role: "user", content: userMessage },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    max_tokens: 2048,
  });

  const text = completion.choices[0]?.message?.content ?? "I'm processing that now.";
  return { text, agentUsed: agentName };
}
