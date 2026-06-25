import { useState } from "react";
import { useListNotes, getListNotesQueryKey, useCreateNote, useUpdateNote, useDeleteNote, Note } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Save, FileText, Search, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function Notes() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const { data: notes, isLoading } = useListNotes({ search });
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const createMutation = useCreateNote();
  const updateMutation = useUpdateNote();
  const deleteMutation = useDeleteNote();

  const handleCreate = () => {
    createMutation.mutate({ data: { title: "Untitled Data Log", body: "" } }, {
      onSuccess: (note) => {
        queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
        setActiveNote(note);
        setTitle(note.title);
        setBody(note.body);
      }
    });
  };

  const handleSave = () => {
    if (!activeNote) return;
    updateMutation.mutate({ id: activeNote.id, data: { title, body } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
        if (activeNote?.id === id) {
          setActiveNote(null);
        }
      }
    });
  };

  const selectNote = (note: Note) => {
    setActiveNote(note);
    setTitle(note.title);
    setBody(note.body);
  };

  return (
    <div className="flex h-full w-full">
      <div className="w-80 border-r border-border bg-sidebar/50 backdrop-blur flex flex-col">
        <div className="p-4 border-b border-border space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">Data Logs</h2>
            <button 
              onClick={handleCreate}
              className="p-1.5 hover:bg-primary/20 hover:text-primary rounded text-muted-foreground transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-input border border-border rounded pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-primary transition-colors text-foreground font-mono"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="flex justify-center p-4"><Loader2 className="w-4 h-4 text-primary animate-spin" /></div>
          ) : notes?.map(note => (
            <div 
              key={note.id}
              onClick={() => selectNote(note)}
              className={`p-3 rounded cursor-pointer group flex items-start justify-between border ${
                activeNote?.id === note.id 
                  ? "bg-card border-primary shadow-[0_0_10px_rgba(157,75,255,0.1)]" 
                  : "bg-transparent border-transparent hover:bg-sidebar-accent"
              }`}
            >
              <div className="overflow-hidden pr-2">
                <div className={`text-sm truncate font-medium ${activeNote?.id === note.id ? "text-primary-foreground" : "text-foreground"}`}>
                  {note.title || "Untitled"}
                </div>
                <div className="text-xs text-muted-foreground truncate mt-1">
                  {note.body.substring(0, 40) || "No content..."}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono mt-2 uppercase">
                  {format(new Date(note.updatedAt), "yyyy-MM-dd HH:mm")}
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-background/50">
        {activeNote ? (
          <>
            <div className="p-4 border-b border-border bg-card flex justify-between items-center">
              <input 
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-transparent border-none outline-none text-xl font-bold text-foreground w-full mr-4 placeholder:text-muted-foreground"
                placeholder="Log Title"
              />
              <button 
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground rounded text-sm font-mono tracking-wide uppercase flex items-center gap-2 transition-all border border-primary/50 disabled:opacity-50"
              >
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Commit
              </button>
            </div>
            <div className="flex-1 p-6 overflow-hidden flex flex-col">
              <textarea 
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="flex-1 w-full bg-transparent border-none outline-none resize-none text-foreground font-mono text-sm leading-relaxed"
                placeholder="Enter log data..."
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground font-mono">
            <FileText className="w-16 h-16 mb-4 opacity-20" />
            <p>NO DATA LOG SELECTED</p>
          </div>
        )}
      </div>
    </div>
  );
}
