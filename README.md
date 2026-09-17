# Career Compass AI

Build a complete AI Career Copilot web application.

The product is an AI-powered Resume Analyzer and Interview Assistant for college students and job seekers.

Tech requirements:

- React.js

- JavaScript/TypeScript

- Tailwind CSS

- Supabase for authentication, PostgreSQL database and storage

- Google Gemini API through secure Supabase Edge Functions

- Responsive desktop and mobile UI

Create these pages:

1. Landing Page

   - Product name: AI Career Copilot

   - Hero section

   - Short description

   - "Analyze My Resume" CTA

   - Features section

   - How It Works section

2. Authentication

   - Login

   - Signup

   - Supabase email/password authentication

3. Dashboard

   - Welcome section

   - Career Readiness Score

   - Resume Score

   - Job Match Score

   - Interview Readiness

   - Recent analyses

   - Quick action buttons

4. Resume Analyzer

   - Upload PDF resume

   - Show uploaded filename

   - Extract resume text

   - Analyze Resume button

   - Display:

     * Overall Resume Score

     * ATS Score

     * Detected Skills

     * Strengths

     * Weaknesses

     * Missing Skills

     * Improvement Suggestions

5. Job Match

   - Resume selector

   - Large Job Description textarea

   - Analyze Match button

   - Display:

     * Match Percentage

     * Matched Skills

     * Missing Skills

     * Important Keywords

     * Recommendations

6. Interview Assistant

   - Select resume

   - Optional job description

   - Interview type:

     * Technical

     * HR

     * Project Based

     * DSA

   - Generate Questions button

   - Display personalized questions and suggested answers

7. Analysis History

   - Previous resume analyses

   - Job matching history

   - Interview sessions

8. Profile

Design:

- Modern premium AI SaaS dashboard

- Clean professional UI

- Attractive cards

- Progress circles

- Skill badges

- Charts where useful

- Blue/purple modern AI theme

- Smooth hover effects

- Responsive layout

- Sidebar navigation after login

Important:

Do not use mock data for the final application.

Prepare the application to connect to Supabase.

Use reusable components.

Keep API keys and Gemini credentials secure and never expose them in frontend code.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://career-quest-ai-15.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a8d7b182-bee3-483c-a6b1-4935de373baf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
