import { useGetDashboardSummary, useGetRecentActivity } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Activity, BrainCircuit, Target, CheckSquare, Briefcase, MessageSquare, StickyNote, Loader2 } from "lucide-react";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: activity, isLoading: isLoadingActivity } = useGetRecentActivity();

  if (isLoadingSummary || isLoadingActivity) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  const stats = [
    { label: "Active Tasks", value: summary?.tasks?.inProgress || 0, icon: CheckSquare, color: "text-accent", bg: "bg-accent/10", border: "border-accent/30" },
    { label: "Projects", value: summary?.projects || 0, icon: Briefcase, color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
    { label: "Goals Tracked", value: summary?.goals || 0, icon: Target, color: "text-chart-4", bg: "bg-chart-4/10", border: "border-chart-4/30" },
    { label: "Memory Nodes", value: summary?.memories || 0, icon: BrainCircuit, color: "text-chart-5", bg: "bg-chart-5/10", border: "border-chart-5/30" },
    { label: "Data Logs", value: summary?.notes || 0, icon: StickyNote, color: "text-chart-2", bg: "bg-chart-2/10", border: "border-chart-2/30" },
    { label: "Comms Links", value: summary?.conversations || 0, icon: MessageSquare, color: "text-chart-3", bg: "bg-chart-3/10", border: "border-chart-3/30" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">Command Center</h1>
        <p className="text-muted-foreground font-mono mt-1 text-sm">OPERATIONAL OVERVIEW // {format(new Date(), "yyyy-MM-dd HH:mm:ss")}</p>
      </header>

      {/* HUD Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className={`p-4 rounded-lg bg-card border ${stat.border} shadow-[0_0_15px_rgba(0,0,0,0.2)] flex flex-col items-center justify-center text-center relative overflow-hidden group`}>
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${stat.bg}`}></div>
            <stat.icon className={`w-6 h-6 mb-3 ${stat.color} relative z-10`} />
            <span className="text-3xl font-bold font-mono text-foreground relative z-10">{stat.value}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 relative z-10">{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Task Breakdown */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card border border-border p-6 rounded-lg shadow-[0_0_20px_rgba(157,75,255,0.05)]">
            <h3 className="font-mono text-sm uppercase tracking-wider text-muted-foreground mb-4 border-b border-border pb-2">Task Pipeline</h3>
            <div className="space-y-4">
              {[
                { label: "TODO", value: summary?.tasks?.todo || 0, color: "bg-muted" },
                { label: "IN PROGRESS", value: summary?.tasks?.inProgress || 0, color: "bg-accent" },
                { label: "BLOCKED", value: summary?.tasks?.blocked || 0, color: "bg-destructive" },
                { label: "DONE", value: summary?.tasks?.done || 0, color: "bg-chart-4" },
              ].map((t, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-muted-foreground">{t.label}</span>
                    <span className="text-foreground">{t.value}</span>
                  </div>
                  <div className="h-1.5 w-full bg-input rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${t.color}`} 
                      style={{ width: `${Math.max(2, (t.value / (summary?.tasks?.total || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border p-6 rounded-lg shadow-[0_0_20px_rgba(157,75,255,0.05)] h-[400px] flex flex-col">
            <h3 className="font-mono text-sm uppercase tracking-wider text-muted-foreground mb-4 border-b border-border pb-2 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Activity Log
            </h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {activity?.map((item) => (
                <div key={item.id} className="flex gap-4 p-3 rounded bg-background/50 border border-border/50 hover:border-primary/30 transition-colors">
                  <div className="text-[10px] font-mono text-muted-foreground whitespace-nowrap pt-1">
                    {format(new Date(item.createdAt), "HH:mm")}
                  </div>
                  <div>
                    <div className="text-sm text-foreground">
                      <span className="font-medium text-primary mr-2">[{item.type}]</span>
                      {item.title}
                    </div>
                    {item.meta && <div className="text-xs text-muted-foreground mt-1">{item.meta}</div>}
                  </div>
                </div>
              ))}
              {!activity?.length && (
                <div className="text-center text-muted-foreground text-sm font-mono py-10">NO RECENT ACTIVITY DETECTED</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
