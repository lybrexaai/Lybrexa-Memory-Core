import { useState } from "react";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Terminal, Lock, Mail, Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const loginMutation = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { email, password } }, {
      onSuccess: (res) => {
        login(res.token);
      }
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(157,75,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(157,75,255,0.03)_1px,transparent_1px)] bg-[size:30px_30px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)]"></div>
      
      <div className="w-full max-w-md bg-card border border-border rounded-lg p-8 shadow-[0_0_40px_rgba(157,75,255,0.15)] relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full border-2 border-primary flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(157,75,255,0.4)]">
            <Terminal className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-widest text-primary-foreground uppercase">Lybrexa OS</h1>
          <p className="text-muted-foreground text-sm font-mono mt-2">AUTHORIZATION REQUIRED</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Operator ID (Email)</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-input border border-border rounded px-10 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground font-mono placeholder:text-muted-foreground/50"
                placeholder="operator@lybrexa.sys"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Passphrase</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-input border border-border rounded px-10 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground font-mono placeholder:text-muted-foreground/50"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          {loginMutation.isError && (
            <div className="text-destructive text-xs font-mono text-center p-2 bg-destructive/10 rounded border border-destructive/30">
              ACCESS DENIED. INVALID CREDENTIALS.
            </div>
          )}

          <button 
            type="submit" 
            disabled={loginMutation.isPending}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 rounded mt-6 transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(157,75,255,0.3)]"
          >
            {loginMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Initialize Connection"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/register" className="text-xs text-muted-foreground hover:text-primary transition-colors font-mono">
            [ REGISTER NEW OPERATOR ]
          </Link>
        </div>
      </div>
    </div>
  );
}
