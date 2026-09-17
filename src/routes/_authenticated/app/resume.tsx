import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, FileText, Loader2, Upload } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getCareerSnapshot } from "@/lib/career.functions";
import { analyzeResumeWithAi } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const Route = createFileRoute("/_authenticated/app/resume")({ head: () => ({ meta: [{ title: "Resume Analyzer | AI Career Copilot" }, { name: "description", content: "Upload a resume and get ATS-aware insights, strengths, gaps, and next steps." }, { property: "og:title", content: "Resume Analyzer | AI Career Copilot" }, { property: "og:description", content: "Get focused feedback on your resume." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: ResumeAnalyzer });

type ProgressStage = "idle" | "processing" | "uploading" | "analyzing";

async function extractPdfText(file: File, onPage: (current: number, total: number) => void) {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  let text = "";
  for (let index = 1; index <= pdf.numPages; index += 1) {
    onPage(index, pdf.numPages);
    const page = await pdf.getPage(index);
    const content = await page.getTextContent();
    text += `${content.items.map((item) => ("str" in item ? item.str : "")).join(" ")}\n`;
  }
  return text.trim();
}

function ResumeAnalyzer() {
  const [file, setFile] = useState<File | null>(null); const [resumeText, setResumeText] = useState(""); const [resumeId, setResumeId] = useState<string | null>(null); const [analysis, setAnalysis] = useState<any>(null); const [match, setMatch] = useState<any>(null); const [stage, setStage] = useState<ProgressStage>("idle"); const [message, setMessage] = useState(""); const [jobDescription, setJobDescription] = useState(""); const [progressText, setProgressText] = useState("");
  useEffect(() => { getCareerSnapshot().then((data) => { const existing = data.resumes[0]; if (existing) { setResumeId(existing.id); setFile(new File([], existing.file_name)); setResumeText(existing.extracted_text ?? ""); const previous = data.analyses.find((item) => item.resume_id === existing.id); setAnalysis(previous ?? null); const previousMatch = data.matches.find((item) => item.resume_id === existing.id); setMatch(previousMatch ?? null); } }).catch(() => setMessage("Your resume workspace could not be loaded. Please refresh and try again.")); }, []);
  const canAnalyze = Boolean(file && resumeText.length >= 40 && resumeId);
async function choose(nextFile: File | undefined) {
  if (!nextFile) return;

  setMessage("");
  setProgressText("");

  if (
    nextFile.type !== "application/pdf" ||
    !nextFile.name.toLowerCase().endsWith(".pdf")
  ) {
    setFile(null);
    setMessage("Please choose a PDF resume.");
    return;
  }

  if (nextFile.size === 0) {
    setFile(null);
    setMessage("This PDF is empty. Please choose a resume with readable content.");
    return;
  }

  if (nextFile.size > MAX_FILE_SIZE) {
    setFile(null);
    setMessage("This PDF is larger than 10 MB. Please choose a smaller resume file.");
    return;
  }

  setFile(nextFile);
  setStage("processing");
  setProgressText("Opening your PDF…");

  try {
    const text = await extractPdfText(nextFile, (current, total) => {
      setProgressText(`Reading page ${current} of ${total}…`);
    });

    if (text.length < 40) {
      throw new Error(
        "We could not extract enough text from this PDF. Try an accessible, text-based resume."
      );
    }

    const { data: user } = await supabase.auth.getUser();

    if (!user.user) {
      throw new Error("Please sign in again.");
    }

    setStage("uploading");
    setProgressText("Saving your resume securely…");

    const path = `${user.user.id}/${crypto.randomUUID()}-${nextFile.name}`;

    const upload = await supabase.storage
      .from("resumes")
      .upload(path, nextFile, {
        upsert: false,
        contentType: "application/pdf",
      });

    if (upload.error) {
      throw new Error(
        upload.error.message || "We could not save your resume. Please try again."
      );
    }

    const inserted = await supabase
      .from("resumes")
      .insert({
        user_id: user.user.id,
        file_name: nextFile.name,
        storage_path: path,
        extracted_text: text,
        status: "ready",
      })
      .select("id")
      .single();

    if (inserted.error) {
      throw new Error(
        inserted.error.message ||
          "Your resume file was saved, but its workspace record could not be created."
      );
    }

    setFile(nextFile);
    setResumeText(text);
    setResumeId(inserted.data.id);
    setAnalysis(null);
    setMatch(null);
    setJobDescription("");
    setProgressText("Resume ready to analyze.");
  } catch (error) {
    setMessage(
      error instanceof Error
        ? error.message
        : "We could not process this resume. Please try another PDF."
    );
    setProgressText("");
  } finally {
    setStage("idle");
  }
}
  async function analyze() { if (!resumeId || resumeText.length < 40) { setMessage("Upload a readable PDF before starting the analysis."); return; } setStage("analyzing"); setProgressText("Reviewing your resume with AI…"); setMessage(""); try { const result = await analyzeResumeWithAi({ data: { resumeId, resumeText, jobDescription } }); setAnalysis(result.analysis); setMatch(result.match); setProgressText(result.match ? "Resume and job match saved." : "Resume analysis saved."); } catch (error) { setMessage(error instanceof Error ? error.message : "The AI analysis could not be completed. Please try again."); setProgressText(""); } finally { setStage("idle"); } }
  const busy = stage !== "idle";
  return <div className="mx-auto max-w-5xl"><Header eyebrow="Resume Analyzer" title="Make your resume work harder" text="Upload a text-based PDF to get ATS scoring and clear, actionable improvements." /><div className="mt-8 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]"><section className="rounded-2xl border border-border bg-card p-5"><label htmlFor="resume-upload" className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-primary/30 bg-ai-soft px-6 text-center transition hover:border-primary/60"><span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary"><Upload className="size-5" /></span><span className="mt-4 font-semibold">{file?.name || "Drop your resume here"}</span><span className="mt-1 text-sm text-muted-foreground">PDF only · up to 10 MB · text-based resumes work best</span><input id="resume-upload" type="file" accept="application/pdf,.pdf" className="sr-only" disabled={busy} onChange={(event) => choose(event.target.files?.[0])} /></label>{file && <div className="mt-4 flex items-center gap-3 rounded-xl border border-border p-3"><FileText className="size-5 text-primary" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.name}</p><p className="text-xs text-muted-foreground">{resumeText.length.toLocaleString()} characters extracted</p></div><CheckCircle2 className="size-4 text-success" /></div>}<div className="mt-5"><Label htmlFor="resume-job-description">Job description <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="resume-job-description" value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} placeholder="Paste a target job description to get a match score and skill gaps…" className="mt-2 min-h-28 resize-y" disabled={busy} /><p className="mt-2 text-xs text-muted-foreground">Leave this blank for a resume-only review.</p></div>{progressText && <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">{busy && <Loader2 className="size-4 animate-spin" />}<span>{progressText}</span></p>}{message && <p className="mt-4 rounded-lg bg-destructive/5 px-3 py-2 text-sm text-destructive">{message}</p>}<Button className="mt-5 w-full bg-ai-gradient" disabled={!canAnalyze || busy} onClick={analyze}>{busy ? <><Loader2 className="animate-spin" /> {stage === "analyzing" ? "Analyzing…" : "Processing…"}</> : "Analyze Resume"}</Button></section>{analysis ? <AnalysisResults analysis={analysis} match={match} /> : <section className="rounded-2xl border border-border bg-card p-6"><p className="text-sm font-semibold text-primary">What you’ll get</p><h2 className="mt-2 font-display text-2xl font-semibold">A practical review, not a vague score</h2><div className="mt-6 space-y-4"><Bullet title="Overall resume score" text="See how clearly your resume communicates your value." /><Bullet title="ATS compatibility" text="Find the structure and keywords automated screeners can read." /><Bullet title="Strengths and gaps" text="Know what to keep, what to fix, and what to learn next." /></div></section>}</div></div>;
}
function AnalysisResults({ analysis, match }: { analysis: any; match: any }) { const list = (value: unknown) => Array.isArray(value) ? value : []; return <section className="rounded-2xl border border-border bg-card p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-primary">Analysis complete</p><h2 className="mt-1 font-display text-2xl font-semibold">Your resume snapshot</h2></div><div className="text-right"><p className="font-display text-3xl font-bold text-primary">{analysis.overall_score}</p><p className="text-xs text-muted-foreground">overall score</p></div></div><div className="mt-5 grid grid-cols-2 gap-3"><Score label="ATS score" value={analysis.ats_score} /><Score label="Overall" value={analysis.overall_score} /></div><Summary title="Experience summary" text={analysis.experience_summary} /><Summary title="Education summary" text={analysis.education_summary} /><ResultGroup title="Detected skills" items={list(analysis.detected_skills)} tone="primary" /><ResultGroup title="Technical skills" items={list(analysis.technical_skills)} tone="primary" /><ResultGroup title="Soft skills" items={list(analysis.soft_skills)} /><ResultGroup title="Strengths" items={list(analysis.strengths)} /><ResultGroup title="Weaknesses" items={list(analysis.weaknesses)} /><ResultGroup title="Missing or improvable areas" items={list(analysis.missing_skills)} tone="warning" /><ResultGroup title="ATS improvement suggestions" items={list(analysis.suggestions)} />{match && <div className="mt-7 border-t border-border pt-6"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-primary">Job description match</p><h3 className="mt-1 font-display text-xl font-semibold">{match.job_title || "Target role"}</h3>{match.company && <p className="mt-1 text-sm text-muted-foreground">{match.company}</p>}</div><div className="text-right"><p className="font-display text-3xl font-bold text-primary">{match.match_percentage}%</p><p className="text-xs text-muted-foreground">match score</p></div></div><div className="mt-5 grid gap-5 md:grid-cols-2"><ResultGroup title="Matched skills" items={list(match.matched_skills)} tone="primary" /><ResultGroup title="Missing skills" items={list(match.missing_skills)} tone="warning" /><ResultGroup title="Important keywords" items={list(match.important_keywords)} /><ResultGroup title="Recommendations" items={list(match.recommendations)} /></div></div>}</section>; }
function Summary({ title, text }: { title: string; text: string }) { return <div className="mt-6"><h3 className="text-sm font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text || "No summary returned."}</p></div>; }
function ResultGroup({ title, items, tone = "default" }: { title: string; items: string[]; tone?: "primary" | "warning" | "default" }) { return <div className="mt-6"><h3 className="text-sm font-semibold">{title}</h3><div className="mt-2 flex flex-wrap gap-2">{items.length ? items.map((item) => <span key={item} className={`rounded-md px-2.5 py-1 text-xs ${tone === "primary" ? "bg-primary/10 text-primary" : tone === "warning" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"}`}>{item}</span>) : <span className="text-sm text-muted-foreground">No items returned.</span>}</div></div>; }
function Score({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-ai-soft p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-display text-2xl font-bold">{value}</p></div>; }
function Bullet({ title, text }: { title: string; text: string }) { return <div className="flex gap-3"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" /><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{text}</p></div></div>; }
 function Header({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) { return <div><Link to="/app" className="text-sm font-semibold text-primary">← Back to dashboard</Link><p className="mt-4 text-xs font-semibold uppercase tracking-[0.15em] text-primary">{eyebrow}</p><h1 className="mt-1 font-display text-3xl font-bold tracking-tight">{title}</h1><p className="mt-2 text-muted-foreground">{text}</p></div>; }
