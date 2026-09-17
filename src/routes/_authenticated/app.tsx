import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, BriefcaseBusiness, FileSearch, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/score-ring";
import { getCareerSnapshot } from "@/lib/career.functions";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Dashboard | AI Career Copilot" }, { name: "description", content: "Track resume, job match, and interview readiness in your AI Career Copilot dashboard." }, { property: "og:title", content: "Dashboard | AI Career Copilot" }, { property: "og:description", content: "Your career readiness command center." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Dashboard,
});

function Dashboard() {
  const location = useLocation();

  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof getCareerSnapshot>> | null>(null);

  useEffect(() => {
    getCareerSnapshot().then(setSnapshot).catch(() => setSnapshot(null));
  }, []);

  if (location.pathname !== "/app") {
    return <Outlet />;
  }
  const latestAnalysis = snapshot?.analyses[0];
  const latestMatch = snapshot?.matches[0];
  const latestInterview = snapshot?.interviews[0];
  const readiness = latestAnalysis ? Math.round((latestAnalysis.overall_score + latestAnalysis.ats_score + (latestMatch?.match_percentage ?? 0)) / (latestMatch ? 3 : 2)) : null;
  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Command center</p>
          <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Your career snapshot</h1>
          <p className="mt-1 text-sm text-muted-foreground">Complete one analysis to see personalized readiness signals here.</p>
        </div>
         <Button asChild className="bg-ai-gradient"><Link to="/app/resume">Analyze My Resume <ArrowRight /></Link></Button>
      </div>
      <div className="mt-7 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Metric title="Career readiness" value={readiness} note={readiness ? "Based on your latest work" : "Waiting for your first analysis"} />
        <Metric title="Resume score" value={latestAnalysis?.overall_score ?? null} note={latestAnalysis ? "Latest resume analysis" : "Upload a resume to begin"} />
        <Metric title="Job match" value={latestMatch?.match_percentage ?? null} note={latestMatch ? latestMatch.job_title : "Compare a target role"} />
        <Metric title="Interview readiness" value={latestInterview ? Math.min(100, (Array.isArray(latestInterview.questions) ? latestInterview.questions.length : 0) * 12) : null} note={latestInterview ? `${latestInterview.interview_type} practice` : "Generate personalized questions"} />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_0.9fr]">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div><h2 className="font-display text-base font-semibold">Recent analyses</h2><p className="mt-1 text-sm text-muted-foreground">Your saved career work, in one place.</p></div>
             <Link to="/app/history" className="text-xs font-semibold text-primary">View history</Link>
          </div>
          {snapshot && snapshot.analyses.length + snapshot.matches.length + snapshot.interviews.length === 0 ? (
            <EmptyState text="Your saved analyses will appear here after you run your first action." />
          ) : (
            <div className="mt-4 divide-y divide-border">
              {latestAnalysis && <Recent icon={FileSearch} title="Resume analysis" detail={`${latestAnalysis.overall_score}/100 overall score`} />}
              {latestMatch && <Recent icon={BriefcaseBusiness} title={latestMatch.job_title} detail={`${latestMatch.match_percentage}% match`} />}
              {latestInterview && <Recent icon={Sparkles} title={`${latestInterview.interview_type} interview session`} detail={`${Array.isArray(latestInterview.questions) ? latestInterview.questions.length : 0} questions generated`} />}
            </div>
          )}
        </section>
        <section className="rounded-2xl border border-primary/20 bg-ai-soft p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Quick actions</p>
          <h2 className="mt-2 font-display text-xl font-semibold">Build momentum</h2>
          <div className="mt-5 space-y-2"><Quick to="/app/resume" icon={FileSearch} text="Analyze a resume" /><Quick to="/app/job-match" icon={BriefcaseBusiness} text="Match a job description" /><Quick to="/app/interview" icon={Sparkles} text="Practice an interview" /></div>
        </section>
      </div>
    </div>
  );
}
function Metric({ title, value, note }: { title: string; value: number | null; note: string }) { return <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs font-medium text-muted-foreground">{title}</p><div className="mt-3 flex items-center justify-center"><ScoreRing value={value} label="" /></div><p className="mt-2 text-center text-[11px] text-muted-foreground">{note}</p></div>; }
function Recent({ icon: Icon, title, detail }: { icon: typeof FileSearch; title: string; detail: string }) { return <div className="flex items-center gap-3 py-3"><span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span><div><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted-foreground">{detail}</p></div></div>; }
 function Quick({ to, icon: Icon, text }: { to: "/app/resume" | "/app/job-match" | "/app/interview"; icon: typeof FileSearch; text: string }) { return <Link to={to} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 text-sm font-medium transition hover:-translate-y-0.5 hover:border-primary/30"><Icon className="size-4 text-primary" />{text}<ArrowRight className="ml-auto size-4 text-muted-foreground" /></Link>; }
function EmptyState({ text }: { text: string }) { return <p className="mt-8 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">{text}</p>; }
