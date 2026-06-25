import { useState, useRef, useEffect } from "react";
import { 
  useListConversations, getListConversationsQueryKey,
  useGetConversation, getGetConversationQueryKey,
  useCreateConversation, useSendMessage, useDeleteConversation 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Send, Bot, User, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function Chat() {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const queryClient = useQueryClient();
  const { data: conversations, isLoading: isLoadingConvs } = useListConversations();
  const { data: activeConv, isLoading: isLoadingMessages } = useGetConversation(activeId!, {
    query: { enabled: !!activeId, queryKey: getGetConversationQueryKey(activeId!) }
  });

  const createMutation = useCreateConversation();
  const sendMutation = useSendMessage();
  const deleteMutation = useDeleteConversation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages]);

  useEffect(() => {
    if (conversations?.length && !activeId) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  const handleCreate = () => {
    createMutation.mutate({ data: { title: "New Comms Link" } }, {
      onSuccess: (newConv) => {
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        setActiveId(newConv.id);
      }
    });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeId) return;

    const content = input;
    setInput("");

    // Optimistic update could go here
    sendMutation.mutate({ id: activeId, data: { content } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetConversationQueryKey(activeId) });
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
      }
    });
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        if (activeId === id) setActiveId(null);
      }
    });
  };

  return (
    <div className="flex h-full w-full">
      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-sidebar/50 backdrop-blur flex flex-col">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">Comms Links</h2>
          <button 
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="p-2 hover:bg-primary/20 hover:text-primary rounded text-muted-foreground transition-colors"
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoadingConvs ? (
            <div className="p-4 text-center text-muted-foreground text-sm font-mono animate-pulse">Scanning frequencies...</div>
          ) : conversations?.map(c => (
            <div 
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`p-3 rounded cursor-pointer group flex items-center justify-between border ${
                activeId === c.id 
                  ? "bg-card border-primary shadow-[0_0_15px_rgba(157,75,255,0.1)]" 
                  : "bg-transparent border-transparent hover:bg-sidebar-accent"
              }`}
            >
              <div className="truncate pr-4 flex-1">
                <div className={`text-sm truncate ${activeId === c.id ? "text-primary-foreground font-medium" : "text-muted-foreground"}`}>
                  {c.title || "Untitled Link"}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono mt-1">
                  {format(new Date(c.updatedAt), "HH:mm:ss")}
                </div>
              </div>
              <button 
                onClick={(e) => handleDelete(c.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background/50 relative">
        {activeId ? (
          <>
            <div className="p-4 border-b border-border bg-card/50 backdrop-blur z-10 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground">{activeConv?.title || "Connecting..."}</h3>
                <p className="text-xs text-muted-foreground font-mono mt-1">SECURE CHANNEL ESTABLISHED</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoadingMessages ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
              ) : activeConv?.messages.map((m, i) => (
                <div key={m.id || i} className={`flex gap-4 max-w-4xl mx-auto ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center border ${
                    m.role === 'user' 
                      ? 'bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(157,75,255,0.2)]' 
                      : 'bg-card border-border text-accent shadow-[0_0_10px_rgba(0,229,255,0.1)]'
                  }`}>
                    {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                        {m.role === 'user' ? 'Operator' : 'Lybrexa AI'}
                      </span>
                      {m.agentUsed && (
                        <span className="text-[9px] uppercase tracking-wider font-mono bg-accent/10 text-accent px-1.5 py-0.5 rounded border border-accent/20">
                          via {m.agentUsed}
                        </span>
                      )}
                    </div>
                    <div className={`p-4 rounded-lg text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user' 
                        ? 'bg-primary/10 border border-primary/30 text-primary-foreground' 
                        : 'bg-card border border-border text-foreground'
                    }`}>
                      {m.content}
                    </div>
                  </div>
                </div>
              ))}
              {sendMutation.isPending && (
                <div className="flex gap-4 max-w-4xl mx-auto">
                  <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center border bg-card border-border text-accent shadow-[0_0_10px_rgba(0,229,255,0.1)]">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-4 rounded-lg bg-card border border-border flex items-center gap-2">
                    <span className="w-2 h-2 bg-accent rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-background border-t border-border">
              <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-end gap-2">
                <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                  placeholder="Transmit command..."
                  className="w-full bg-input border border-border rounded-lg pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none min-h-[50px] max-h-[200px]"
                  rows={1}
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || sendMutation.isPending}
                  className="absolute right-2 bottom-2 p-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 transition-all shadow-[0_0_10px_rgba(157,75,255,0.3)]"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground font-mono">
            <Bot className="w-16 h-16 mb-4 opacity-20" />
            <p>NO ACTIVE COMM LINK</p>
            <p className="text-xs mt-2 opacity-50">Select or create a link to begin transmission</p>
          </div>
        )}
      </div>
    </div>
  );
}
