# LaunchGuard AI

Pre-launch technical diligence for early-stage web apps.

LaunchGuard helps early-stage builders find technical, security, UX, and positioning risks before showing their product to users, investors, or demo audiences.

## Who It Is For

- Student founders preparing to show a prototype
- Indie hackers launching a side project
- Accelerator teams, campus clubs, and mentors reviewing cohort projects
- Technical reviewers who need a quick, evidence-based launch-readiness pass

## What It Checks

LaunchGuard takes a public GitHub repo URL, live demo URL, short product description, and report audience mode. It evaluates:

- Repo structure and key project files
- README quality, setup docs, env guidance, demo links, and limitations
- Deployment health and live URL reachability
- Security headers and possible secret-like patterns
- Validation, database, auth, middleware, and framework indicators
- Demo clarity
- Market readiness: target user, problem clarity, value proposition, and product credibility

Working prototypes often still have launch blockers. LaunchGuard turns those risks into a concise diligence report a founder can act on before a demo, investor conversation, accelerator review, or public launch.

## Report Audience Modes

The same deterministic evidence can be shaped for different readers:

- **Founder** - practical next actions before sharing the product
- **Investor / Mentor** - clearer risks, credibility signals, and questions
- **Technical Reviewer** - more explicit audit boundaries and technical follow-up
- **Accelerator Program** - cohort-friendly readiness checklist language

## Features

- Public GitHub repo URL parsing, including `github.com/owner/repo` and `owner/repo`
- Targeted file checks for README, package metadata, lockfiles, env examples, configs, middleware, API routes, Prisma/Drizzle/Supabase signals, and Vercel config
- Safe package dependency detection for common readiness signals
- Live URL status check with response code and final URL
- Security header checks for CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and HSTS
- Cautious possible secret-like pattern detection with redacted evidence
- Rule-based scoring for production, security, demo clarity, and market readiness
- Founder Readiness Memo with target user, user pain, credibility signals, main technical risk, main market risk, and mentor/investor questions
- Launch Plan grouped by what to fix before users, mentors/investors, and production launch
- Launch Simulation showing likely audience reactions from founders, mentors, technical reviewers, and program reviewers
- Copyable Founder Brief for Devpost, mentor review, and demo prep
- Optional server-only Gemini synthesis hook when `GEMINI_API_KEY` is available
- Rule-based demo mode that works with no API key
- Sample report fallback for unreliable Wi-Fi or GitHub/live URL issues during demos

## Why Not Just ChatGPT?

LaunchGuard is not a generic prompt. It first collects structured evidence from the public repo and live deployment, then turns those deterministic signals into a diligence report. Optional Gemini-assisted synthesis can make the report easier to read, but deterministic scanner evidence remains the source of truth.

## Built For A Real Workflow

LaunchGuard can start with free public repo audits for early builders. A paid version could offer deeper scans, exportable diligence reports, richer AI synthesis, and accelerator/team plans for cohort readiness reviews. Buyers could include entrepreneurship clubs, accelerator programs, campus startup orgs, and founder communities that need repeatable readiness reviews.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- React
- Lucide icons
- Native `fetch`

## How It Works

1. The user submits a public GitHub repo URL, live demo URL, product description, and audience mode.
2. `POST /api/scan` normalizes and validates the inputs.
3. The API fetches targeted public repo files from raw GitHub URLs and best-effort GitHub contents endpoints.
4. The API checks the live URL and selected security headers.
5. Deterministic rules generate scores, findings, summary text, market-readiness feedback, demo advice, Founder Readiness Memo, Launch Plan, and Launch Simulation.
6. If `GEMINI_API_KEY` exists, the server may ask Gemini to synthesize and prioritize the deterministic findings for the selected audience. Gemini must not invent facts.
7. If Gemini is missing, fails, or returns invalid JSON, LaunchGuard returns the rule-based report.

## Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Manual API Test

With the dev server running:

```bash
curl -s -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -d '{"repoUrl":"https://github.com/owner/repo","liveUrl":"https://example.com","description":"A web app for early-stage builders that helps them catch launch blockers before sharing with users.","reportAudience":"founder"}'
```

Or run:

```bash
node scripts/smoke-scan.mjs
```

## Optional AI Mode

No API key is required for rule-based demo mode.

If you later set a server-side `GEMINI_API_KEY`, LaunchGuard can attempt optional AI-assisted synthesis of the deterministic report text. Do not expose this key to the browser, and do not put Gemini credentials in any client-side public environment variable.

## Deployment Notes

- Deploy on Vercel or any platform that supports Next.js.
- No required environment variables for rule-based demo mode.
- Optional: set `GEMINI_API_KEY` only if you want AI-assisted synthesis.
- Public GitHub repos only.

## What Was Built During The Hackathon

- End-to-end scan flow from form to report dashboard
- Deterministic scanner for targeted GitHub files and live URL metadata
- Report audience modes
- Rule-based scoring system
- Evidence-based generated report text
- Founder Readiness Memo
- Launch Plan
- Launch Simulation
- Copyable Founder Brief
- Optional server-only AI synthesis architecture
- Demo-friendly sample report path
- Submission-ready README and Devpost draft

## Known Limitations

- Public repos only.
- Targeted file checks, not full static analysis.
- API route detection is best-effort.
- Possible secret detection is regex-based and may produce false positives.
- Live URL checks are best-effort and depend on network/hosting behavior.
- The Founder Readiness Memo is generated from submitted text and deterministic findings; vague descriptions produce cautious, limited market conclusions.
- Not a replacement for a professional security audit.

## Future Improvements

- Deeper GitHub API integration
- PR comments with launch-readiness feedback
- Private repo support with explicit auth
- Richer AI synthesis grounded in full repo context
- Exportable diligence reports
- Accelerator/team dashboards for cohort readiness reviews
- CI/CD integration
- Historical scan tracking

## Demo Instructions

1. Paste a public GitHub repo URL.
2. Paste the live demo URL.
3. Enter a short product description.
4. Choose the report audience.
5. Click **Run launch audit**.
6. Review the overall score, score breakdown, findings, Founder Readiness Memo, Launch Simulation, Launch Plan, next steps, positioning feedback, and demo readiness advice.
7. Use **Copy Founder Brief** for Devpost, mentors, or demo prep.
8. Use **Load sample report** if Wi-Fi, GitHub, or a live deployment is unreliable during a live presentation.
