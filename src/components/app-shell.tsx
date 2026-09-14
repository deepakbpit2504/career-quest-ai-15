import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  BriefcaseBusiness,
  FileSearch,
  History,
  LogOut,
  Menu,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { label: "Dashboard", to: "/app", icon: BarChart3 },
  { label: "Resume Analyzer", to: "/app/resume", icon: FileSearch },
  { label: "Job Match", to: "/app/job-match", icon: BriefcaseBusiness },
  { label: "Interview Assistant", to: "/app/interview", icon: Sparkles },
  { label: "History", to: "/app/history", icon: History },
  { label: "Profile", to: "/app/profile", icon: UserRound },
] as const;

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = navItems.find((item) => location.pathname === item.to)?.label ?? "Dashboard";

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-card/90 backdrop-blur-md lg:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Link
            to="/app"
            className="flex items-center gap-2.5"
            onClick={() => setMobileOpen(false)}
          >
            <BrandMark />
            <span className="font-display text-sm font-semibold">AI Career Copilot</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle navigation"
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X /> : <Menu />}
          </Button>
        </div>
        {mobileOpen && (
          <NavContent
            current={current}
            onNavigate={() => setMobileOpen(false)}
            onSignOut={signOut}
            mobile
          />
        )}
      </header>
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-card/70 p-5 lg:flex lg:flex-col">
          <Link to="/app" className="flex items-center gap-2.5">
            <BrandMark />
            <span className="font-display text-base font-semibold">AI Career Copilot</span>
          </Link>
          <NavContent current={current} onNavigate={() => undefined} onSignOut={signOut} />
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <div className="grid size-9 place-items-center rounded-xl bg-ai-gradient text-xs font-extrabold text-primary-foreground shadow-ai">
      AI
    </div>
  );
}

function NavContent({
  current,
  onNavigate,
  onSignOut,
  mobile = false,
}: {
  current: string;
  onNavigate: () => void;
  onSignOut: () => void;
  mobile?: boolean;
}) {
  return (
    <div
      className={
        mobile ? "border-t border-border bg-card px-4 pb-4" : "flex min-h-0 flex-1 flex-col"
      }
    >
      <nav className="mt-7 space-y-1">
        {navItems.map(({ label, to, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${current === label ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </nav>
      {!mobile && (
        <div className="mt-auto rounded-xl bg-ai-gradient p-4 text-primary-foreground shadow-ai">
          <p className="text-sm font-semibold">Your plan is ready</p>
          <p className="mt-1 text-xs opacity-80">
            Analyze your resume to unlock personalized next steps.
          </p>
          <Link
            to="/app/resume"
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-primary-foreground/15 py-2 text-xs font-semibold transition hover:bg-primary-foreground/25"
          >
            Start analysis
          </Link>
        </div>
      )}
      <Button
        variant="ghost"
        className="mt-4 justify-start text-muted-foreground"
        onClick={onSignOut}
      >
        <LogOut className="size-4" />
        Sign out
      </Button>
    </div>
  );
}
