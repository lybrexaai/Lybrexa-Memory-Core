import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/use-auth";
import { Route, Switch, useLocation } from "wouter";
import Login from "./pages/login";
import Register from "./pages/register";

// Placeholder components to be filled in parallel
import Chat from "./pages/chat";
import Dashboard from "./pages/dashboard";
import Notes from "./pages/notes";
import Tasks from "./pages/tasks";
import Journal from "./pages/journal";
import Projects from "./pages/projects";
import Goals from "./pages/goals";
import Memory from "./pages/memory";
import { useEffect } from "react";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading || !user) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Main() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (user) setLocation("/chat");
      else setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  return null;
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Main} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/chat" component={() => <ProtectedRoute component={Chat} />} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/notes" component={() => <ProtectedRoute component={Notes} />} />
      <Route path="/tasks" component={() => <ProtectedRoute component={Tasks} />} />
      <Route path="/journal" component={() => <ProtectedRoute component={Journal} />} />
      <Route path="/projects" component={() => <ProtectedRoute component={Projects} />} />
      <Route path="/goals" component={() => <ProtectedRoute component={Goals} />} />
      <Route path="/memory" component={() => <ProtectedRoute component={Memory} />} />
      <Route>
        <div className="flex h-screen items-center justify-center bg-background text-foreground font-mono">
          404 - SECTOR NOT FOUND
        </div>
      </Route>
    </Switch>
  );
}

export default function App() {
  return <AppRouter />;
}
