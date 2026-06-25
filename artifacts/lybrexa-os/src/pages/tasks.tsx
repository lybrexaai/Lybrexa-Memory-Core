import { useState } from "react";
import { useListTasks, getListTasksQueryKey, useCreateTask, useUpdateTask, useDeleteTask } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, GripVertical, AlertTriangle, Loader2 } from "lucide-react";

const COLUMNS = [
  { id: "TODO", label: "Awaiting Action" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "BLOCKED", label: "Blocked" },
  { id: "DONE", label: "Completed" }
];

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-destructive text-destructive-foreground border-destructive shadow-[0_0_10px_rgba(255,71,114,0.3)]",
  HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/50",
  MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  LOW: "bg-muted text-muted-foreground border-border"
};

export default function Tasks() {
  const queryClient = useQueryClient();
  const { data: tasks, isLoading } = useListTasks();
  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();
  const deleteMutation = useDeleteTask();

  const handleCreate = (status: string) => {
    createMutation.mutate({ data: { title: "New Directive", status, priority: "MEDIUM" } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() })
    });
  };

  const handleUpdateStatus = (id: number, status: string) => {
    updateMutation.mutate({ id, data: { status } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() })
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() })
    });
  };

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

  return (
    <div className="p-8 h-full flex flex-col">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">Directives</h1>
        <p className="text-muted-foreground font-mono mt-1 text-sm">OPERATIONAL PIPELINE</p>
      </header>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
        {COLUMNS.map(col => {
          const colTasks = tasks?.filter(t => t.status === col.id) || [];
          return (
            <div key={col.id} className="flex-1 min-w-[300px] flex flex-col bg-sidebar/30 rounded-lg border border-border">
              <div className="p-3 border-b border-border flex justify-between items-center bg-card rounded-t-lg shadow-[0_4px_10px_rgba(0,0,0,0.2)]">
                <div className="flex items-center gap-2">
                  <h3 className="font-mono text-sm uppercase tracking-wider font-bold text-foreground">{col.label}</h3>
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">{colTasks.length}</span>
                </div>
                <button 
                  onClick={() => handleCreate(col.id)}
                  className="p-1 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {colTasks.map(task => (
                  <div key={task.id} className="bg-card border border-border p-3 rounded shadow-sm group hover:border-primary/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground/50 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.LOW}`}>
                          {task.priority}
                        </span>
                      </div>
                      <button 
                        onClick={() => handleDelete(task.id)}
                        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    <input 
                      value={task.title}
                      onChange={(e) => updateMutation.mutate({ id: task.id, data: { title: e.target.value } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }) })}
                      className="w-full bg-transparent border-none focus:outline-none text-sm font-medium mt-2 text-foreground"
                    />
                    
                    {col.id === "BLOCKED" && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-destructive font-mono uppercase bg-destructive/10 px-2 py-1 rounded border border-destructive/20 w-fit">
                        <AlertTriangle className="w-3 h-3" /> Requires Intervention
                      </div>
                    )}

                    <div className="mt-4 flex gap-1 justify-end">
                      {COLUMNS.filter(c => c.id !== col.id).map(c => (
                        <button
                          key={c.id}
                          onClick={() => handleUpdateStatus(task.id, c.id)}
                          className="text-[9px] uppercase font-mono px-2 py-1 bg-input hover:bg-primary/20 hover:text-primary text-muted-foreground rounded transition-colors"
                        >
                          → {c.label.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
