# LaunchGuard AI

## Short Description

LaunchGuard AI is an AI-assisted pre-launch audit tool for early-stage web apps. It scans a public GitHub repo and live demo URL, then generates a practical launch-readiness report for security, infrastructure, documentation, demo clarity, and positioning.

## Inspiration

Early-stage builders move fast, especially during hackathons, class projects, and first startup prototypes. The hard part is that many launch blockers are not obvious until someone else tries the app: missing setup docs, unclear product positioning, weak environment variable hygiene, unreachable deployments, or security headers that were never configured. We wanted LaunchGuard AI to act like a calm pre-launch checklist for builders before they share their work with real people.

## What It Does

LaunchGuard AI asks for a public GitHub repo URL, a live demo URL, and a short product description. It checks targeted repo files, package signals, live deployment status, security headers, possible secret-like patterns, API route signals, validation signals, documentation quality, and product positioning. It then produces a launch-readiness report with an overall score, category scores, top findings, evidence, recommendations, next steps, positioning feedback, and demo advice.

## How We Built It

We built LaunchGuard AI with Next.js App Router, TypeScript, Tailwind CSS, and React. The scanner runs in a Next.js route handler at `POST /api/scan`. It uses deterministic checks, public raw GitHub file fetches, best-effort GitHub contents checks, live URL metadata, and rule-based scoring. The app works fully in no-key demo mode. We also added a safe optional server-only Gemini synthesis hook: if `GEMINI_API_KEY` exists, it can synthesize the deterministic findings into clearer report text; if it is missing or fails, the rule-based report still works.

## Challenges

- Balancing useful audits with honest scope so the product does not overclaim.
- Handling missing GitHub files and unreachable live URLs gracefully.
- Designing a meaningful no-key demo mode with a $0 budget.
- Keeping findings evidence-based and cautious.
- Making the dashboard polished enough for a live demo without overengineering.

## Accomplishments

- Built an end-to-end scanner and report dashboard.
- Added rule-based scoring for production readiness, security, demo clarity, and business feasibility.
- Created safe fallback modes so the app works without paid APIs or API keys.
- Added targeted security and infrastructure checks with practical recommendations.
- Framed the product as a production-readiness tool for founders and early builders.

## What We Learned

Production readiness is multi-dimensional. A project can have strong code but weak docs, a reachable demo but poor security headers, or a compelling feature set but vague positioning. We also learned that simple deterministic checks can produce surprisingly useful launch insights, and that AI is most helpful when grounded in concrete evidence rather than asked to invent an audit from scratch.

## What’s Next

- Richer AI-assisted synthesis grounded in more repo context.
- GitHub PR comments for launch-readiness feedback.
- Private repo support with explicit authentication.
- Saved scan history and team checklists.
- CI/CD integration for pre-launch gates.
- More robust static analysis for framework-specific risks.

## Built During The Hackathon

During the hackathon we built the working Next.js app, scan form, deterministic scanner, scoring logic, report dashboard, optional AI-assisted architecture, sample report fallback, README, and Devpost draft. The current version intentionally works without required paid APIs or API keys.
