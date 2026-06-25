import { useListProjects, getListProjectsQueryKey, useCreateProject } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Briefcase, Plus, Github, Folder, Loader2 } from "lucide-react";

export default function Projects() {
  const queryClient = useQueryClient();
  const { data: projects, isLoading } = useListProjects();
  const createMutation = useCreateProject();

  const handleCreate = () => {
    createMutation.mutate({ data: { name: "Project X", status: "ACTIVE" } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() })
    });
  };

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex justify-between items-end border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">Projects</h1>
          <p className="text-muted-foreground font-mono mt-1 text-sm">INITIATIVE TRACKING</p>
        </div>
        <button 
          onClick={handleCreate}
          className="flex items-center gap-2 bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground border border-primary px-4 py-2 rounded font-mono text-sm uppercase tracking-wider transition-colors"
        >
          <Plus className="w-4 h-4" /> New Initiative
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects?.map(project => (
          <div key={project.id} className="bg-card border border-border p-6 rounded-lg shadow-md hover:border-primary/50 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-primary/10 border border-primary/30 flex items-center justify-center text-primary group-hover:shadow-[0_0_15px_rgba(157,75,255,0.3)] transition-all">
                  <Folder className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{project.name}</h3>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1 mt-1">
                    <span className={`w-2 h-2 rounded-full ${project.status === 'ACTIVE' ? 'bg-accent animate-pulse shadow-[0_0_5px_rgba(0,229,255,0.8)]' : 'bg-muted'}`}></span>
                    {project.status}
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-6 h-10 line-clamp-2">
              {project.description || "No parameters specified."}
            </p>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <div className="text-xs font-mono text-muted-foreground">
                <span className="text-foreground font-bold">{project.taskCount || 0}</span> Tasks
              </div>
              {project.repoUrl && (
                <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                  <Github className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
