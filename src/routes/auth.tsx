import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in | AI Career Copilot" }, { name: "description", content: "Sign in to your AI Career Copilot workspace." }, { property: "og:title", content: "Sign in | AI Career Copilot" }, { property: "og:description", content: "Sign in to analyze resumes and prepare for interviews." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const result = mode === "login" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin } });
    if (result.error) setMessage(result.error.message);
    else if (mode === "signup" && !result.data.session) setMessage("Check your email to confirm your account, then come back to sign in.");
    else await navigate({ to: "/app" });
    setBusy(false);
  }

  async function google() { setBusy(true); const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin }); if (result.error) { setMessage(result.error.message); setBusy(false); } }

  return <div className="grid min-h-screen bg-canvas lg:grid-cols-[1.05fr_0.95fr]"><div className="hidden bg-ai-gradient p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between"><div className="flex items-center gap-2.5"><div className="grid size-9 place-items-center rounded-xl bg-primary-foreground/15 text-xs font-extrabold">AI</div><span className="font-display font-semibold">AI Career Copilot</span></div><div><p className="max-w-md font-display text-4xl font-bold leading-tight">A clearer path to the role you want.</p><p className="mt-5 max-w-md text-primary-foreground/75">Turn your resume, target role, and interview prep into one focused plan.</p></div><p className="text-sm text-primary-foreground/60">Private workspace · Built for students and job seekers</p></div><div className="flex items-center justify-center p-6"><div className="w-full max-w-md"><div className="mb-8 flex items-center gap-2.5 lg:hidden"><div className="grid size-9 place-items-center rounded-xl bg-ai-gradient text-xs font-extrabold text-primary-foreground">AI</div><span className="font-display font-semibold">AI Career Copilot</span></div><div className="mb-8"><p className="text-sm font-semibold text-primary">Your career workspace</p><h1 className="mt-2 font-display text-3xl font-bold">{mode === "login" ? "Welcome back" : "Start your career plan"}</h1><p className="mt-2 text-muted-foreground">{mode === "login" ? "Sign in to continue where you left off." : "Create a private workspace for your next opportunity."}</p></div><form onSubmit={submit} className="space-y-4">{mode === "signup" && <div className="space-y-2"><Label htmlFor="name">Full name</Label><Input id="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required placeholder="Your name" /></div>}<div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@example.com" /></div><div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} placeholder="At least 6 characters" /></div>{message && <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{message}</p>}<Button type="submit" disabled={busy} className="h-11 w-full bg-ai-gradient">{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</Button></form><div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div><Button type="button" variant="outline" disabled={busy} onClick={google} className="h-11 w-full">Continue with Google</Button><p className="mt-6 text-center text-sm text-muted-foreground">{mode === "login" ? "New here?" : "Already have an account?"} <button type="button" className="font-semibold text-primary hover:underline" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>{mode === "login" ? "Create an account" : "Sign in"}</button></p></div></div></div>;
}