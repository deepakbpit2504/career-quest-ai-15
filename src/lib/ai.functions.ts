import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ResumeAnalysisSchema = z.object({
  overallScore: z.number().min(0).max(100),
  atsScore: z.number().min(0).max(100),
  detectedSkills: z.array(z.string()),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  missingSkills: z.array(z.string()),
  suggestions: z.array(z.string()),
});

const JobMatchSchema = z.object({
  matchPercentage: z.number().min(0).max(100),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  importantKeywords: z.array(z.string()),
  recommendations: z.array(z.string()),
  jobTitle: z.string(),
  company: z.string().nullable(),
});

const InterviewSchema = z.object({
  questions: z.array(z.object({
    question: z.string(),
    suggestedAnswer: z.string(),
    focus: z.string(),
  })),
});

async function runGemini(prompt: string): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI service is not configured yet.");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "google/gemini-3.8-flash",
      stream: true,
      messages: [
        { role: "system", content: "You are a precise career coach. Return only valid JSON matching the requested schema. Do not use markdown fences." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `AI request failed with status ${response.status}.`);
  }
  if (!response.body) throw new Error("AI response was empty.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let output = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const parsed = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
        output += parsed.choices?.[0]?.delta?.content ?? "";
      } catch {
        // Ignore incomplete SSE frames; the next frame completes them.
      }
    }
  }
  return output.trim();
}

function parseJson<T>(text: string, schema: z.ZodType<T>): T {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return schema.parse(JSON.parse(cleaned));
}

export const analyzeResumeWithAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ resumeId: z.string().uuid(), resumeText: z.string().min(40) }).parse(input))
  .handler(async ({ data, context }) => {
    const result = parseJson(await runGemini(`Analyze this resume for a college student or job seeker. Score it for clarity, impact, ATS compatibility, and role readiness. Keep every list concise and actionable.\n\nRESUME:\n${data.resumeText}`), ResumeAnalysisSchema);
    const { data: saved, error } = await context.supabase.from("resume_analyses").insert({
      user_id: context.userId,
      resume_id: data.resumeId,
      overall_score: result.overallScore,
      ats_score: result.atsScore,
      detected_skills: result.detectedSkills,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      missing_skills: result.missingSkills,
      suggestions: result.suggestions,
    }).select("*").single();
    if (error) throw new Error(error.message);
    return { analysis: saved };
  });

export const analyzeJobMatchWithAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ resumeId: z.string().uuid(), resumeText: z.string().min(40), jobDescription: z.string().min(40) }).parse(input))
  .handler(async ({ data, context }) => {
    const result = parseJson(await runGemini(`Compare this resume to the job description. Identify the most important ATS and human-review signals. Return a realistic percentage and concise lists.\n\nRESUME:\n${data.resumeText}\n\nJOB DESCRIPTION:\n${data.jobDescription}`), JobMatchSchema);
    const { data: saved, error } = await context.supabase.from("job_matches").insert({
      user_id: context.userId,
      resume_id: data.resumeId,
      job_title: result.jobTitle,
      company: result.company,
      job_description: data.jobDescription,
      match_percentage: result.matchPercentage,
      matched_skills: result.matchedSkills,
      missing_skills: result.missingSkills,
      important_keywords: result.importantKeywords,
      recommendations: result.recommendations,
    }).select("*").single();
    if (error) throw new Error(error.message);
    return { match: saved };
  });

export const generateInterviewWithAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ resumeId: z.string().uuid(), resumeText: z.string().min(40), jobDescription: z.string(), interviewType: z.enum(["Technical", "HR", "Project Based", "DSA"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const result = parseJson(await runGemini(`Create 6 personalized ${data.interviewType} interview questions from this resume${data.jobDescription ? " and job description" : ""}. Give each question a practical suggested answer and the skill it tests.\n\nRESUME:\n${data.resumeText}\n\nJOB DESCRIPTION:\n${data.jobDescription}`), InterviewSchema);
    const { data: saved, error } = await context.supabase.from("interview_sessions").insert({
      user_id: context.userId,
      resume_id: data.resumeId,
      job_description: data.jobDescription || null,
      interview_type: data.interviewType,
      questions: result.questions,
    }).select("*").single();
    if (error) throw new Error(error.message);
    return { session: saved };
  });