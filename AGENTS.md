<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code, especially for App Router route handlers and file conventions.
<!-- END:nextjs-agent-rules -->

# LaunchGuard AI Agent Notes

## Project Overview

LaunchGuard AI is a pre-launch audit tool for student founders, indie hackers, and early-stage web apps. It scans a public GitHub repo, checks a live demo URL, and generates a launch-readiness report for documentation, security signals, infrastructure, demo clarity, and product positioning.

Do not frame this as a hackathon-submission optimizer. Frame it as a practical pre-launch audit for early builders.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run build
```

## Important Files

- `src/app/page.tsx` - landing page, scan form, sample report, results dashboard
- `src/app/api/scan/route.ts` - deterministic scanner and optional server-only Gemini synthesis hook
- `src/app/types.ts` - shared report/check types
- `README.md` - judge/user documentation
- `DEVPOST.md` - Devpost draft copy

## Constraints

- No paid API required.
- Rule-based demo mode must work without any API key.
- Optional `GEMINI_API_KEY` is server-only; never put Gemini credentials in client-side public environment variables.
- Do not add required paid AI providers.
- Do not add auth.
- Do not add a database.
- Do not add private repo support.
- Do not add background jobs.
- Missing files and live URL failures must produce partial reports, not crashes.

## Verification Checklist

- `npm run lint` passes.
- `npm run build` passes.
- Real scan still works through `POST /api/scan`.
- Invalid GitHub URLs return friendly errors.
- No browser-exposed AI credentials.
- No secrets are printed in findings.

## Code Style

- Keep the MVP simple and demo-ready.
- Prefer targeted checks over heavy recursive scanning.
- Use TypeScript types from `src/app/types.ts`.
- Keep report language cautious: use "not detected in targeted scan" when uncertain.
- Avoid overclaiming AI behavior when no key is configured.

## Hackathon Expectations

Prioritize a polished, honest, working product over broad but fragile features. The core demo should show: enter repo + live URL + description, run audit, review scores/findings/next steps, and copy a concise report summary.
