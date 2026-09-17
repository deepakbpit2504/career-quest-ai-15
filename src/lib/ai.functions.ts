import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ResumeAnalysisSchema = z.object({
  overallScore: z.number().min(0).max(100),
  atsScore: z.number().min(0).max(100),
  detectedSkills: z.array(z.string()),
  technicalSkills: z.array(z.string()),
  softSkills: z.array(z.string()),
  experienceSummary: z.string(),
  educationSummary: z.string(),
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

const ResumeReviewSchema = z.object({
  analysis: ResumeAnalysisSchema,
  match: JobMatchSchema.nullable(),
});

async function runGemini(prompt: string): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];

  if (!key) {
    throw new Error("AI service is not configured yet.");
  }

  const response = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        stream: false,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content:
              "You are a precise career coach. Return ONLY one valid JSON object. Do not use markdown fences or any text outside the JSON object.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();

    let message = body;

    try {
      const parsed = JSON.parse(body) as {
        error?: { message?: string };
        message?: string;
      };

      message = parsed.error?.message ?? parsed.message ?? body;
    } catch {
      // Keep plain-text response
    }

    if (response.status === 402) {
      throw new Error(
        message ||
          "AI credits are unavailable. Please ask the workspace owner to add credits."
      );
    }

    if (response.status === 403) {
      throw new Error(
        message || "AI analysis is currently unavailable for this workspace."
      );
    }

    if (response.status === 429) {
      throw new Error(
        "AI analysis is busy right now. Please wait a moment and try again."
      );
    }

    if (response.status >= 500) {
      throw new Error(
        "The AI service is temporarily unavailable. Please try again shortly."
      );
    }

    throw new Error(
      message || `AI request failed with status ${response.status}.`
    );
  }

  const result = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const output = result.choices?.[0]?.message?.content?.trim();

  if (!output) {
    throw new Error("The AI service returned an empty analysis.");
  }

  return output;
}

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
  if (buffer.startsWith("data:")) {
    const payload = buffer.slice(5).trim();
    if (payload && payload !== "[DONE]") {
      try {
        const parsed = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
        output += parsed.choices?.[0]?.delta?.content ?? "";
      } catch {
        // Ignore an incomplete terminal frame.
      }
    }
  }
  if (!output.trim()) throw new Error("The AI service returned an empty analysis.");
  return output.trim();
}


function parseJson<T>(text: string, schema: z.ZodType<T>): T {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start < 0 || end <= start) {
      throw new Error("The AI returned an unreadable analysis. Please try again.");
    }

    try {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      throw new Error("The AI returned an unreadable analysis. Please try again.");
    }
  }

  const result = schema.safeParse(parsed);

  if (!result.success) {
    throw new Error("The AI returned an unreadable analysis. Please try again.");
  }

  return result.data;
}

export const analyzeResumeWithAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        resumeId: z.string().uuid(),
        resumeText: z.string().min(40),
        jobDescription: z.string().max(20000).optional().default(""),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const { data: resume, error: resumeError } = await context.supabase
      .from("resumes")
      .select("id, extracted_text")
      .eq("id", data.resumeId)
      .maybeSingle();

    if (resumeError) throw new Error(resumeError.message);

    if (!resume) {
      throw new Error(
        "That resume is no longer available in your workspace."
      );
    }

    const resumeText =
      resume.extracted_text?.trim() || data.resumeText.trim();

    if (resumeText.length < 40) {
      throw new Error(
        "This resume does not contain enough readable text to analyze."
      );
    }

    const jobDescription = data.jobDescription.trim();

    const prompt = `
Analyze the following resume for a college student or job seeker.

Return ONLY ONE valid JSON object.

The JSON MUST have exactly this structure:

{
  "analysis": {
    "overallScore": 0,
    "atsScore": 0,
    "detectedSkills": [],
    "technicalSkills": [],
    "softSkills": [],
    "experienceSummary": "",
    "educationSummary": "",
    "strengths": [],
    "weaknesses": [],
    "missingSkills": [],
    "suggestions": []
  },
  "match": null
}

Rules for analysis:
- overallScore must be a number from 0 to 100.
- atsScore must be a number from 0 to 100.
- detectedSkills must be an array of strings.
- technicalSkills must be an array of strings.
- softSkills must be an array of strings.
- experienceSummary must be a string.
- educationSummary must be a string.
- strengths must be an array of strings.
- weaknesses must be an array of strings.
- missingSkills must be an array of strings.
- suggestions must be an array of strings.
- Keep all lists concise and actionable.
- Do not use snake_case.
- Do not add extra fields.

If there is NO job description, match MUST be exactly null.

If a job description IS provided, match MUST be:

{
  "matchPercentage": 0,
  "matchedSkills": [],
  "missingSkills": [],
  "importantKeywords": [],
  "recommendations": [],
  "jobTitle": "",
  "company": null
}

Rules for match:
- matchPercentage must be a number from 0 to 100.
- matchedSkills must be an array of strings.
- missingSkills must be an array of strings.
- importantKeywords must be an array of strings.
- recommendations must be an array of strings.
- jobTitle must be a string.
- company must be a string or null.
- Do not use snake_case.
- Do not add extra fields.

IMPORTANT:
- Return ONLY JSON.
- Do NOT use markdown.
- Do NOT use code fences.
- Do NOT include explanations outside the JSON.
- Use double quotes for all JSON keys and string values.
- Ensure the JSON is valid and parseable.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription || "None provided"}
`;

    const result = parseJson(
      await runGemini(prompt),
      ResumeReviewSchema
    );

    const { data: saved, error } = await context.supabase
      .from("resume_analyses")
      .insert({
        user_id: context.userId,
        resume_id: data.resumeId,
        overall_score: result.analysis.overallScore,
        ats_score: result.analysis.atsScore,
        detected_skills: result.analysis.detectedSkills,
        technical_skills: result.analysis.technicalSkills,
        soft_skills: result.analysis.softSkills,
        experience_summary: result.analysis.experienceSummary,
        education_summary: result.analysis.educationSummary,
        strengths: result.analysis.strengths,
        weaknesses: result.analysis.weaknesses,
        missing_skills: result.analysis.missingSkills,
        suggestions: result.analysis.suggestions,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    let match = null;

    if (jobDescription && result.match) {
      const { data: savedMatch, error: matchError } =
        await context.supabase
          .from("job_matches")
          .insert({
            user_id: context.userId,
            resume_id: data.resumeId,
            job_title: result.match.jobTitle,
            company: result.match.company,
            job_description: jobDescription,
            match_percentage: result.match.matchPercentage,
            matched_skills: result.match.matchedSkills,
            missing_skills: result.match.missingSkills,
            important_keywords: result.match.importantKeywords,
            recommendations: result.match.recommendations,
          })
          .select("*")
          .single();

      if (matchError) throw new Error(matchError.message);

      match = savedMatch;
    }

    return { analysis: saved, match };
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
