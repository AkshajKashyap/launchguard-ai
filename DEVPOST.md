# LaunchGuard AI

## Short Description

LaunchGuard AI provides pre-launch technical diligence for early-stage web apps. It helps student founders, indie hackers, and accelerator teams find technical, security, UX, and positioning risks before showing a product to users, investors, mentors, or demo audiences.

## Inspiration

Early-stage builders often have working prototypes that still are not launch-ready. A demo can load locally but fail publicly. A repo can have code but no setup path. A product can have features but no clear target user or pain. We wanted LaunchGuard AI to give founders and accelerator teams a practical diligence memo before the moment where first impressions matter.

## What It Does

LaunchGuard asks for a public GitHub repo URL, live demo URL, product description, and report audience. It checks repo structure, docs, deployment health, security headers, possible secret-like patterns, validation/database/auth indicators, demo clarity, and positioning. It then produces a launch-readiness report with scores, findings, evidence, recommendations, next steps, a Founder Readiness Memo, and a Launch Plan.

The report can be tailored for founders, investors/mentors, technical reviewers, or accelerator programs. The underlying evidence and scores stay the same; the wording and prioritization adapt to the audience.

## Customer / User Segment

The first users are student founders, indie hackers, campus startup clubs, entrepreneurship programs, and accelerator teams. They need a fast, repeatable way to review whether a web app is ready to show publicly without requiring a full engineering review or paid tooling.

## Possible Business Model

LaunchGuard could offer free public repo audits for individual builders. A pro tier could add deeper scans, exportable Founder Briefs, richer AI synthesis, historical comparisons, and more detailed technical diligence. Accelerator or team plans could support cohort readiness reviews before demo days, showcases, or office-hour reviews.

## Why This Is Not Just Another AI Wrapper

LaunchGuard does not ask an LLM to hallucinate a startup report from a prompt. The core report is grounded in deterministic checks: targeted repo files, dependency signals, live deployment status, security headers, README quality, and description analysis. Optional Gemini-assisted synthesis can make recommendations clearer for the selected audience, but the deterministic scanner remains the source of truth and the app works fully without any API key.

## How We Built It

We built LaunchGuard AI with Next.js App Router, TypeScript, Tailwind CSS, and React. The scanner runs in a Next.js route handler at `POST /api/scan`. It uses public raw GitHub file fetches, best-effort GitHub contents checks, live URL metadata, rule-based scoring, deterministic report templates, report audience modes, and a Launch Plan generator. We also added a safe optional server-only Gemini synthesis hook: if `GEMINI_API_KEY` exists, it can synthesize and prioritize deterministic findings for the chosen audience; if it is missing or fails, the rule-based report still works.

## Challenges

- Making the product feel like useful diligence rather than a basic repo checker.
- Balancing useful technical signals with honest scope.
- Tailoring the same evidence for founders, mentors, technical reviewers, and accelerator programs.
- Handling missing GitHub files and unreachable live URLs gracefully.
- Designing a meaningful no-key demo mode with a $0 budget.
- Keeping findings evidence-based and cautious.
- Making the dashboard polished enough for a 90-second demo without overengineering.

## Accomplishments

- Built an end-to-end pre-launch diligence scanner and dashboard.
- Added report audience modes.
- Added rule-based scoring for production readiness, security, demo clarity, and market readiness.
- Added a Founder Readiness Memo that connects technical findings to founder-facing questions.
- Added a Launch Plan with actions before users, mentors/investors, and production launch.
- Added a copyable Founder Brief for mentors, Devpost, and demo prep.
- Created safe fallback modes so the app works without paid APIs or API keys.
- Framed the product around startup readiness for founders, indie hackers, and accelerator teams.

## What We Learned

Production readiness is multi-dimensional. A project can have strong code but weak docs, a reachable demo but poor security headers, or a compelling feature set but vague positioning. We also learned that AI is more useful when grounded in concrete evidence, and that deterministic checks can produce surprisingly helpful diligence for early teams.

## What’s Next

- Richer AI-assisted synthesis grounded in more repo context.
- Exportable diligence memos for founder updates, mentor reviews, and investor prep.
- GitHub PR comments for launch-readiness feedback.
- Private repo support with explicit authentication.
- Accelerator/team dashboards for cohort readiness reviews.
- Saved scan history and team checklists.
- CI/CD integration for pre-launch gates.

## Built During The Hackathon

During the hackathon we built the working Next.js app, scan form, deterministic scanner, scoring logic, report dashboard, report audience modes, Founder Readiness Memo, Launch Plan, Founder Brief copy flow, optional AI-assisted architecture, sample report fallback, README, and Devpost draft. The current version intentionally works without required paid APIs or API keys.
