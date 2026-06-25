import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { 
  MessageSquare, 
  StickyNote, 
  CheckSquare, 
  Book, 
  Briefcase, 
  Target, 
  BrainCircuit, 
  LayoutDashboard,
  LogOut,
  Terminal
} from "lucide-react";
import logo from "../../../../attached_assets/Lybrexa_Profile_1782391580735.png";

const NAV_ITEMS = [
  { href: "/chat", icon: MessageSquare, label: "Comms" },
  { href: "/dashboard", icon: LayoutDashboard, label: "Command" },
  { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/notes", icon: StickyNote, label: "Notes" },
  { href: "/journal", icon: Book, label: "Logs" },
  { href: "/projects", icon: Briefcase, label: "Projects" },
  { href: "/goals", icon: Target, label: "Objectives" },
  { href: "/memory", icon: BrainCircuit, label: "Memory" },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { logout, user } = useAuth();

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans">
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-10 shrink-0">
        <div className="p-6 flex items-center gap-4 border-b border-sidebar-border relative">
          <div className="relative">
            <img src={logo} alt="Lybrexa Logo" className="w-10 h-10 rounded-full border border-primary/30" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-accent rounded-full animate-pulse shadow-[0_0_8px_rgba(0,229,255,0.8)] border border-background"></div>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-wider uppercase text-primary">Lybrexa OS</span>
            <span className="text-[10px] text-accent font-mono tracking-widest opacity-80">SYSTEM ONLINE</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className="block">
                <div className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm transition-all duration-200 ${
                  isActive 
                    ? "bg-primary/10 text-primary-foreground border-l-2 border-primary shadow-[inset_4px_0_0_0_rgba(157,75,255,1)]" 
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}>
                  <item.icon className={`w-4 h-4 ${isActive ? "text-primary" : ""}`} />
                  <span className={isActive ? "font-medium" : ""}>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center justify-between px-2 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              <span className="font-mono text-xs">{user?.displayName || "OPERATOR"}</span>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-md text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Terminate Session</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto relative">
        <motion.div
          key={location}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
