import { useListMemories, getListMemoriesQueryKey, useCreateMemory, useGetMemoryStats } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { BrainCircuit, Search, Plus, Network, Loader2 } from "lucide-react";
import { useState } from "react";

export default function Memory() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const { data: memories, isLoading } = useListMemories({ search });
  const { data: stats } = useGetMemoryStats();

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

  return (
    <div className="p-8 h-full flex flex-col max-w-7xl mx-auto">
      <header className="mb-8 border-b border-border pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase flex items-center gap-3">
            <BrainCircuit className="w-8 h-8 text-primary" /> Memory Core
          </h1>
          <p className="text-muted-foreground font-mono mt-1 text-sm">LONG-TERM KNOWLEDGE GRAPH</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="text-right mr-4 font-mono">
            <div className="text-2xl text-accent font-bold">{stats?.total || 0}</div>
            <div className="text-[10px] text-muted-foreground uppercase">Stored Nodes</div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Query memory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-input border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary transition-all text-foreground font-mono w-64"
            />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {memories?.map(memory => (
            <div key={memory.id} className="bg-card border border-border rounded-lg p-5 flex flex-col hover:border-primary/50 transition-colors shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-input">
                <div className="h-full bg-primary shadow-[0_0_10px_rgba(157,75,255,0.8)]" style={{ width: `${memory.importance * 100}%` }}></div>
              </div>
              <div className="flex justify-between items-start mt-2 mb-3">
                <span className="text-[10px] uppercase font-mono tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
                  {memory.category}
                </span>
                <Network className="w-4 h-4 text-muted-foreground opacity-50 group-hover:text-primary group-hover:opacity-100 transition-all" />
              </div>
              <h3 className="font-bold text-foreground mb-2 text-sm">{memory.title}</h3>
              <p className="text-muted-foreground text-xs leading-relaxed flex-1 line-clamp-4">
                {memory.content}
              </p>
              {memory.tags && memory.tags.length > 0 && (
                <div className="flex gap-2 mt-4 pt-3 border-t border-border/50 flex-wrap">
                  {memory.tags.map(tag => (
                    <span key={tag} className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
