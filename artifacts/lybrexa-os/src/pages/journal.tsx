import { useState } from "react";
import { useListJournalEntries, getListJournalEntriesQueryKey, useCreateJournalEntry, useUpdateJournalEntry } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Loader2 } from "lucide-react";

export default function Journal() {
  const queryClient = useQueryClient();
  const { data: entries, isLoading } = useListJournalEntries();
  const createMutation = useCreateJournalEntry();
  const updateMutation = useUpdateJournalEntry();

  const handleCreate = () => {
    createMutation.mutate({ 
      data: { date: format(new Date(), 'yyyy-MM-dd'), body: "Operator log initiated...", mood: 5 } 
    }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListJournalEntriesQueryKey() })
    });
  };

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto p-8 h-full flex flex-col">
      <header className="mb-8 flex justify-between items-end border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">Personal Logs</h1>
          <p className="text-muted-foreground font-mono mt-1 text-sm">OPERATOR STATE TRACKING</p>
        </div>
        <button 
          onClick={handleCreate}
          className="flex items-center gap-2 bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground border border-primary px-4 py-2 rounded font-mono text-sm uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(157,75,255,0.2)]"
        >
          <Plus className="w-4 h-4" /> New Entry
        </button>
      </header>

      <div className="flex-1 overflow-y-auto space-y-6 pb-12 pr-4">
        {entries?.map(entry => (
          <div key={entry.id} className="bg-card border border-border p-6 rounded-lg relative overflow-hidden group shadow-md">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 group-hover:bg-primary transition-colors"></div>
            
            <div className="flex justify-between items-start mb-4">
              <div className="font-mono text-sm text-primary tracking-widest uppercase">
                LOG // {format(new Date(entry.date), "yyyy.MM.dd")}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground uppercase">State:</span>
                <input 
                  type="range" 
                  min="1" max="10" 
                  value={entry.mood || 5}
                  onChange={(e) => updateMutation.mutate({ id: entry.id, data: { mood: parseInt(e.target.value) } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListJournalEntriesQueryKey() }) })}
                  className="w-24 accent-primary"
                />
                <span className="text-xs font-mono text-accent bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20 w-6 text-center">
                  {entry.mood}
                </span>
              </div>
            </div>

            <textarea 
              value={entry.body}
              onChange={(e) => updateMutation.mutate({ id: entry.id, data: { body: e.target.value } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListJournalEntriesQueryKey() }) })}
              className="w-full bg-transparent border-none outline-none text-foreground font-mono text-sm leading-relaxed resize-none min-h-[100px]"
              placeholder="Record log..."
            />
          </div>
        ))}
        {!entries?.length && (
          <div className="text-center text-muted-foreground font-mono py-12">NO LOGS RECORDED</div>
        )}
      </div>
    </div>
  );
}
