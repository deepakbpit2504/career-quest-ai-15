import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getCareerSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [profile, resumes, analyses, matches, interviews] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
      context.supabase.from("resumes").select("*").order("created_at", { ascending: false }),
      context.supabase.from("resume_analyses").select("*").order("created_at", { ascending: false }),
      context.supabase.from("job_matches").select("*").order("created_at", { ascending: false }),
      context.supabase.from("interview_sessions").select("*").order("created_at", { ascending: false }),
    ]);
    for (const result of [profile, resumes, analyses, matches, interviews]) if (result.error) throw new Error(result.error.message);
    return { profile: profile.data, resumes: resumes.data ?? [], analyses: analyses.data ?? [], matches: matches.data ?? [], interviews: interviews.data ?? [] };
  });

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ fullName: z.string().min(1).max(100), targetRole: z.string().max(120), bio: z.string().max(500), skills: z.array(z.string()).max(30) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: profile, error } = await context.supabase.from("profiles").upsert({ id: context.userId, full_name: data.fullName, target_role: data.targetRole || null, bio: data.bio || null, skills: data.skills }).select("*").single();
    if (error) throw new Error(error.message);
    return { profile };
  });