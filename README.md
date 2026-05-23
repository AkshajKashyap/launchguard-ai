# LaunchGuard AI

AI-assisted launch-readiness audits for early-stage web apps.

LaunchGuard AI helps student founders, indie hackers, and early-stage builders catch launch blockers before sharing a web app with users, investors, or demo audiences.

## What It Does

LaunchGuard takes three inputs:

- Public GitHub repo URL
- Live demo URL
- Short product description

It then generates a launch-readiness report that evaluates:

- Documentation and setup clarity
- Security signals and possible secret-like patterns
- Infrastructure and deployment readiness
- Live demo reachability and security headers
- UX/demo clarity
- Product positioning and business feasibility

## Why It Matters

Early builders ship fast, but launch blockers often hide in plain sight: missing setup docs, unclear positioning, weak environment variable hygiene, unreachable deployments, missing security headers, or API routes without validation signals. LaunchGuard bridges the gap between "prototype works on my machine" and "ready to share with real people."

## Features

- Public GitHub repo URL parsing, including `github.com/owner/repo` and `owner/repo`
- Targeted file checks for README, package metadata, lockfiles, env examples, configs, middleware, API routes, Prisma/Drizzle/Supabase signals, and Vercel config
- Safe package dependency detection for common launch-readiness signals
- Live URL status check with response code and final URL
- Security header checks for CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and HSTS
- Cautious possible secret-like pattern detection with redacted evidence
- Rule-based scoring for production, security, demo clarity, and business feasibility
- Evidence-based findings with severity, category, evidence, and recommendation
- Optional server-only Gemini synthesis hook when `GEMINI_API_KEY` is available
- Rule-based demo mode that works with no API key
- Sample report fallback for unreliable Wi-Fi or GitHub/live URL issues during demos
- Copy helpers for summary, findings, and founder next steps

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- React
- Lucide icons
- Native `fetch`

## How It Works

1. The user submits a public GitHub repo URL, live demo URL, and product description.
2. `POST /api/scan` normalizes and validates the inputs.
3. The API fetches targeted public repo files from raw GitHub URLs and best-effort GitHub contents endpoints.
4. The API checks the live URL and selected security headers.
5. Deterministic rules generate scores, findings, summary text, positioning feedback, and demo advice.
6. If `GEMINI_API_KEY` exists, the server may ask Gemini to synthesize the deterministic findings into clearer report text. The deterministic checks remain the source of truth.
7. If Gemini is missing or fails, LaunchGuard returns the rule-based report.

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
  -d '{"repoUrl":"https://github.com/owner/repo","liveUrl":"https://example.com","description":"A web app for early-stage builders that helps them catch launch blockers before sharing with users."}'
```

Or run the lightweight smoke helper:

```bash
node scripts/smoke-scan.mjs
```

## Optional AI Mode

No API key is required for the current rule-based demo mode.

If you later set a server-side `GEMINI_API_KEY`, LaunchGuard can attempt optional AI-assisted synthesis of the deterministic report text. Do not expose this key to the browser, and do not put Gemini credentials in any client-side public environment variable.

For Gemini REST usage, the implementation follows Google AI for Developers guidance for the `generateContent` endpoint with the `x-goog-api-key` header: https://ai.google.dev/api

## Deployment Notes

- Deploy on Vercel or any platform that supports Next.js.
- No required environment variables for rule-based demo mode.
- Optional: set `GEMINI_API_KEY` only if you want AI-assisted synthesis.
- Public GitHub repos only.

## What Was Built During The Hackathon

- End-to-end scan flow from form to report dashboard
- Deterministic scanner for targeted GitHub files and live URL metadata
- Rule-based scoring system
- Evidence-based generated report text
- Optional server-only AI synthesis architecture
- Demo-friendly sample report path
- Submission-ready README and Devpost draft

## Known Limitations

- Public repos only.
- Targeted file checks, not full static analysis.
- API route detection is best-effort.
- Possible secret detection is regex-based and may produce false positives.
- Live URL checks are best-effort and depend on network/hosting behavior.
- Not a replacement for a professional security audit.

## Future Improvements

- Deeper GitHub API integration
- PR comments with launch-readiness feedback
- Private repo support with explicit auth
- Richer AI synthesis grounded in full repo context
- CI/CD integration
- Historical scan tracking
- Team checklists and saved reports

## Demo Instructions

1. Paste a public GitHub repo URL.
2. Paste the live demo URL.
3. Enter a short product description.
4. Click **Run launch audit**.
5. Review the overall score, score breakdown, findings, next steps, positioning feedback, and demo readiness advice.
6. Use **Load sample report** if Wi-Fi, GitHub, or a live deployment is unreliable during a live presentation.
