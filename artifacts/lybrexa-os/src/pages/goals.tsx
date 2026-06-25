import { useListGoals, getListGoalsQueryKey, useCreateGoal } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Target, Plus, Loader2 } from "lucide-react";

const HORIZON_COLORS: Record<string, string> = {
  LIFE: "bg-primary shadow-[0_0_10px_rgba(157,75,255,0.5)]",
  LONG: "bg-accent shadow-[0_0_10px_rgba(0,229,255,0.5)]",
  MEDIUM: "bg-chart-4 shadow-[0_0_10px_rgba(0,255,100,0.5)]",
  SHORT: "bg-foreground shadow-[0_0_10px_rgba(201,201,214,0.5)]"
};

export default function Goals() {
  const queryClient = useQueryClient();
  const { data: goals, isLoading } = useListGoals();
  const createMutation = useCreateGoal();

  const handleCreate = () => {
    createMutation.mutate({ data: { title: "New Objective", horizon: "SHORT", progress: 0 } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() })
    });
  };

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-8 flex justify-between items-end border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">Strategic Objectives</h1>
          <p className="text-muted-foreground font-mono mt-1 text-sm">MACRO TRAJECTORY</p>
        </div>
        <button 
          onClick={handleCreate}
          className="flex items-center gap-2 bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground border border-primary px-4 py-2 rounded font-mono text-sm uppercase tracking-wider transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Target
        </button>
      </header>

      <div className="space-y-4">
        {goals?.map(goal => (
          <div key={goal.id} className="bg-card border border-border p-5 rounded-lg flex items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded border border-white/10 ${
                  goal.horizon === 'LIFE' ? 'bg-primary/20 text-primary border-primary/30' :
                  goal.horizon === 'LONG' ? 'bg-accent/20 text-accent border-accent/30' :
                  goal.horizon === 'MEDIUM' ? 'bg-chart-4/20 text-chart-4 border-chart-4/30' :
                  'bg-muted text-foreground border-border'
                }`}>
                  {goal.horizon}
                </span>
                <h3 className="font-medium text-foreground text-lg">{goal.title}</h3>
              </div>
              <div className="h-2 w-full bg-input rounded-full overflow-hidden mt-3">
                <div 
                  className={`h-full ${HORIZON_COLORS[goal.horizon] || HORIZON_COLORS.SHORT}`} 
                  style={{ width: `${goal.progress * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="font-mono text-2xl font-bold text-muted-foreground w-16 text-right">
              {Math.round(goal.progress * 100)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
