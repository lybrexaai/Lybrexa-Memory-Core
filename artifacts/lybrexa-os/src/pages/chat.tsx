import { useState, useRef, useEffect, useCallback } from "react";
import {
  useListConversations, getListConversationsQueryKey,
  useGetConversation, getGetConversationQueryKey,
  useCreateConversation, useDeleteConversation,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Send, Bot, User, Loader2, Zap, Mic, MicOff, Volume2 } from "lucide-react";
import { format } from "date-fns";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

type LocalMessage = {
  id?: number;
  role: "user" | "assistant";
  content: string;
  agentUsed?: string | null;
  streaming?: boolean;
};

function useStreamingChat(activeId: number | null) {
  const queryClient = useQueryClient();
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const syncFromServer = useCallback((msgs: LocalMessage[]) => {
    setLocalMessages(msgs);
  }, []);

  const send = useCallback(async (content: string) => {
    if (!activeId || !content.trim() || isStreaming) return;

    setStreamError(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: LocalMessage = { role: "user", content };
    const assistantPlaceholder: LocalMessage = { role: "assistant", content: "", streaming: true };
    setLocalMessages(prev => [...prev, userMsg, assistantPlaceholder]);
    setIsStreaming(true);

    const token = localStorage.getItem("lybrexa_token");

    try {
      const resp = await fetch(`/api/chat/conversations/${activeId}/messages/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error ?? `HTTP ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          let event: Record<string, unknown>;
          try { event = JSON.parse(raw); } catch { continue; }

          if (event.type === "token") {
            const tok = event.token as string;
            setLocalMessages(prev => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.streaming) {
                next[next.length - 1] = { ...last, content: last.content + tok };
              }
              return next;
            });
          } else if (event.type === "done") {
            const finalAgent = event.agentUsed as string;
            setLocalMessages(prev => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.streaming) {
                next[next.length - 1] = { ...last, streaming: false, agentUsed: finalAgent, id: event.assistantMessageId as number };
              }
              return next;
            });
            queryClient.invalidateQueries({ queryKey: getGetConversationQueryKey(activeId) });
            queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          } else if (event.type === "error") {
            throw new Error(event.error as string);
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Unknown error";
      setStreamError(msg);
      setLocalMessages(prev => prev.filter(m => !m.streaming));
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [activeId, isStreaming, queryClient]);

  return { localMessages, syncFromServer, send, isStreaming, streamError };
}

function VoicePreviewButton() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/lybrexa-voice-preview.mp3");
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setPlaying(true);
    }
  };

  return (
    <button
      data-testid="button-voice-preview"
      onClick={toggle}
      title={playing ? "Stop preview" : "Preview Lybrexa voice"}
      className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-mono uppercase tracking-widest transition-all ${
        playing
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-border text-muted-foreground hover:border-accent/30 hover:text-accent"
      }`}
    >
      <Volume2 className={`w-3 h-3 ${playing ? "animate-pulse" : ""}`} />
      {playing ? "Playing..." : "Voice Preview"}
    </button>
  );
}

export default function Chat() {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  const { data: conversations, isLoading: isLoadingConvs } = useListConversations();
  const { data: activeConv, isLoading: isLoadingMessages } = useGetConversation(activeId!, {
    query: { enabled: !!activeId, queryKey: getGetConversationQueryKey(activeId!) },
  });

  const createMutation = useCreateConversation();
  const deleteMutation = useDeleteConversation();

  const { localMessages, syncFromServer, send, isStreaming, streamError } = useStreamingChat(activeId);

  const {
    state: voiceState,
    interimText,
    errorMessage: voiceError,
    isListening,
    isUnsupported,
    start: startListening,
    stop: stopListening,
    abort: abortListening,
  } = useSpeechRecognition({
    onTranscript: (text) => {
      setInput(prev => {
        const joined = prev.trim() ? `${prev.trim()} ${text}` : text;
        // Resize textarea after state update
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
          }
        }, 0);
        return joined;
      });
      // Focus the textarea after transcription
      setTimeout(() => textareaRef.current?.focus(), 50);
    },
  });

  useEffect(() => {
    if (activeConv?.messages && !isStreaming) {
      syncFromServer(activeConv.messages.map(m => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        agentUsed: m.agentUsed ?? null,
      })));
    }
  }, [activeConv?.messages, isStreaming, syncFromServer]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  useEffect(() => {
    if (conversations?.length && !activeId) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  // Stop listening if streaming starts
  useEffect(() => {
    if (isStreaming && isListening) abortListening();
  }, [isStreaming, isListening, abortListening]);

  const handleCreate = () => {
    createMutation.mutate({ data: { title: undefined } }, {
      onSuccess: (newConv) => {
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        syncFromServer([]);
        setActiveId(newConv.id);
      },
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isListening) stopListening();
    const content = input.trim();
    if (!content || !activeId || isStreaming) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    await send(content);
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        if (activeId === id) { setActiveId(null); syncFromServer([]); }
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as React.FormEvent);
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Mic button appearance
  const micDisabled = isUnsupported || isStreaming;
  const showInterim = isListening && interimText;

  return (
    <div className="flex h-full w-full" data-testid="chat-page">
      {/* Conversation sidebar */}
      <div className="w-72 border-r border-border bg-sidebar/50 backdrop-blur flex flex-col shrink-0">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Comm Links</h2>
          <button
            data-testid="button-new-conversation"
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="p-1.5 hover:bg-primary/20 hover:text-primary rounded text-muted-foreground transition-colors"
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {isLoadingConvs ? (
            <div className="p-4 text-center text-muted-foreground text-xs font-mono animate-pulse">Scanning frequencies...</div>
          ) : conversations?.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-xs font-mono opacity-50">No comm links</div>
          ) : conversations?.map(c => (
            <div
              key={c.id}
              data-testid={`conversation-item-${c.id}`}
              onClick={() => { setActiveId(c.id); syncFromServer([]); }}
              className={`p-3 rounded cursor-pointer group flex items-start justify-between border transition-all ${
                activeId === c.id
                  ? "bg-card border-primary/40 shadow-[0_0_12px_rgba(157,75,255,0.08)]"
                  : "bg-transparent border-transparent hover:bg-sidebar-accent"
              }`}
            >
              <div className="truncate pr-2 flex-1 min-w-0">
                <div className={`text-xs truncate font-medium ${activeId === c.id ? "text-foreground" : "text-muted-foreground"}`}>
                  {c.title ?? "Untitled Link"}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  {c.agentUsed && (
                    <span className="text-[9px] uppercase tracking-wider font-mono text-accent/70 bg-accent/10 px-1 py-0.5 rounded border border-accent/15">
                      {c.agentUsed}
                    </span>
                  )}
                  <span className="text-[9px] text-muted-foreground font-mono">
                    {format(new Date(c.updatedAt), "HH:mm")}
                  </span>
                </div>
              </div>
              <button
                data-testid={`button-delete-conversation-${c.id}`}
                onClick={(e) => handleDelete(c.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 mt-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeId ? (
          <>
            {/* Header */}
            <div className="px-6 py-3 border-b border-border bg-card/30 backdrop-blur flex items-center gap-3 shrink-0">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm text-foreground truncate">
                  {activeConv?.title ?? "Connecting..."}
                </h3>
                <p className="text-[10px] text-muted-foreground font-mono tracking-widest mt-0.5">SECURE CHANNEL ESTABLISHED</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <VoicePreviewButton />
                {isStreaming && (
                  <div className="flex items-center gap-1.5 text-accent text-[10px] font-mono tracking-widest">
                    <Zap className="w-3 h-3 animate-pulse" />
                    STREAMING
                  </div>
                )}
                {isListening && (
                  <div className="flex items-center gap-1.5 text-destructive text-[10px] font-mono tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-ping" />
                    LISTENING
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              {isLoadingMessages && localMessages.length === 0 ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
              ) : localMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground font-mono py-16">
                  <Bot className="w-12 h-12 mb-4 opacity-15" />
                  <p className="text-xs uppercase tracking-widest opacity-50">Awaiting transmission</p>
                </div>
              ) : (
                localMessages.map((m, i) => (
                  <div
                    key={m.id ?? `local-${i}`}
                    data-testid={`message-${m.role}-${i}`}
                    className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div className={`w-7 h-7 rounded shrink-0 flex items-center justify-center border ${
                      m.role === "user"
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "bg-card border-border text-accent"
                    }`}>
                      {m.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                    </div>

                    <div className={`flex flex-col gap-1 max-w-[75%] ${m.role === "user" ? "items-end" : "items-start"}`}>
                      <div className="flex items-center gap-2 px-0.5">
                        <span className="text-[9px] uppercase tracking-widest font-mono text-muted-foreground">
                          {m.role === "user" ? "Operator" : "Lybrexa"}
                        </span>
                        {m.agentUsed && (
                          <span className="text-[8px] uppercase tracking-wider font-mono bg-accent/10 text-accent px-1.5 py-0.5 rounded border border-accent/20">
                            via {m.agentUsed}
                          </span>
                        )}
                        {m.streaming && (
                          <span className="text-[8px] uppercase tracking-wider font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 animate-pulse">
                            live
                          </span>
                        )}
                      </div>

                      <div className={`px-4 py-3 rounded-lg text-sm leading-relaxed whitespace-pre-wrap ${
                        m.role === "user"
                          ? "bg-primary/10 border border-primary/25 text-foreground"
                          : "bg-card border border-border text-foreground"
                      }`}>
                        {m.content}
                        {m.streaming && (
                          <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle animate-pulse" />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {streamError && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-xs text-destructive font-mono">
                  TRANSMISSION ERROR: {streamError}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="px-6 py-4 border-t border-border bg-background/60 backdrop-blur shrink-0">

              {/* Interim voice text preview */}
              {showInterim && (
                <div className="mb-2 px-4 py-2 rounded border border-destructive/20 bg-destructive/5 text-xs text-muted-foreground font-mono flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0 animate-ping" />
                  <span className="italic opacity-70">{interimText}</span>
                </div>
              )}

              {/* Voice error */}
              {voiceError && !isListening && (
                <div className="mb-2 px-3 py-1.5 rounded border border-destructive/20 bg-destructive/5 text-[10px] text-destructive font-mono">
                  {voiceError}
                </div>
              )}

              <form
                onSubmit={handleSend}
                className="relative flex items-end gap-2"
                data-testid="form-send-message"
              >
                <textarea
                  ref={textareaRef}
                  data-testid="input-message"
                  value={input}
                  onChange={handleTextareaInput}
                  onKeyDown={handleKeyDown}
                  disabled={isStreaming}
                  placeholder={
                    isStreaming
                      ? "Lybrexa is transmitting..."
                      : isListening
                      ? "Listening... speak your command"
                      : "Transmit command... (Enter to send, Shift+Enter for newline)"
                  }
                  className={`w-full bg-input border rounded-lg px-4 py-3 pr-24 text-sm focus:outline-none focus:ring-1 transition-all resize-none min-h-[50px] max-h-[200px] disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted-foreground/50 ${
                    isListening
                      ? "border-destructive/50 focus:border-destructive focus:ring-destructive/30 shadow-[0_0_12px_rgba(255,50,80,0.08)]"
                      : "border-border focus:border-primary focus:ring-primary"
                  }`}
                  rows={1}
                />

                {/* Mic button */}
                {!isUnsupported && (
                  <button
                    data-testid="button-mic"
                    type="button"
                    onClick={handleMicClick}
                    disabled={micDisabled}
                    title={isListening ? "Stop recording (click or send)" : "Start voice input"}
                    className={`absolute right-10 bottom-2 p-2 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                      isListening
                        ? "bg-destructive/20 text-destructive border border-destructive/40 shadow-[0_0_12px_rgba(255,50,80,0.2)] animate-pulse"
                        : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    }`}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                )}

                {/* Send button */}
                <button
                  data-testid="button-send"
                  type="submit"
                  disabled={!input.trim() || isStreaming}
                  className="absolute right-2 bottom-2 p-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_10px_rgba(157,75,255,0.25)]"
                >
                  {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>

              {/* Voice hint */}
              {!isUnsupported && !isStreaming && (
                <p className="text-[9px] text-muted-foreground/40 font-mono mt-1.5 text-right">
                  {isListening ? "click mic or send to confirm" : "mic for voice input"}
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground font-mono">
            <Bot className="w-16 h-16 mb-4 opacity-10" />
            <p className="text-xs uppercase tracking-widest">No active comm link</p>
            <p className="text-[10px] mt-2 opacity-40">Select or create a link to begin transmission</p>
            <button
              data-testid="button-create-first-conversation"
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="mt-6 flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded text-primary text-xs font-mono uppercase tracking-widest transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Open Comm Link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
