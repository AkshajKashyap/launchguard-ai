"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  FileText,
  Globe2,
  Loader2,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
  Server,
  Users,
} from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import type { AnalysisMode, ReportAudience, ScanReport, TopFinding } from "@/app/types";

const sampleInputs = {
  repoUrl: "github.com/owner/repo",
  liveUrl: "https://your-demo.vercel.app",
  description:
    "LaunchGuard AI helps student founders and indie hackers catch launch blockers before sharing web apps with users, investors, or demo audiences.",
};

const demoCaseStudyReport: ScanReport = {
  analysisMode: "rule-based",
  analysisNote: "Demo case study data for live presentation. No external request was made.",
  reportAudience: "founder",
  overallScore: 73,
  productionScore: 68,
  securityScore: 61,
  demoClarityScore: 79,
  businessFeasibilityScore: 76,
  summary:
    "campus-builder/clubops scored 73/100 for launch readiness. The live demo responded with HTTP 200. Strongest area: demo clarity (79/100). Biggest risk from the targeted scan: API routes were detected, but an input validation library was not detected. Recommended next fix: Add validation around event, member, and sponsor outreach inputs before sharing with real campus clubs.",
  topFindings: [
    {
      severity: "high",
      category: "security",
      title: "API routes were detected without a validation signal",
      evidence: "Targeted scan detected app/api route indicators, but did not detect zod, yup, joi, or valibot in dependencies.",
      recommendation:
        "Add a validation layer around event, member, and sponsor outreach inputs before accepting real club data.",
    },
    {
      severity: "high",
      category: "infrastructure",
      title: "Environment variable example file was not detected",
      evidence: ".env.example was not found in the targeted file set.",
      recommendation:
        "Add an .env.example with safe placeholder values for database, auth, and deployment variables so another developer can run the project.",
    },
    {
      severity: "medium",
      category: "security",
      title: "Security headers were not fully detected",
      evidence: "Not detected on the live response: content-security-policy, x-frame-options, permissions-policy.",
      recommendation:
        "Add baseline browser protections through the hosting platform or Next.js headers config before a public launch.",
    },
    {
      severity: "medium",
      category: "documentation",
      title: "Setup documentation is not yet reviewer-ready",
      evidence: "README.md was detected, but setup/run and environment variable instructions were not detected in the sample scan.",
      recommendation:
        "Add a short local setup section, required environment variables, and a demo account path for mentors or technical reviewers.",
    },
    {
      severity: "medium",
      category: "security",
      title: "Auth or middleware was not detected in the targeted scan",
      evidence: "No middleware.ts, src/middleware.ts, or common auth dependency was detected in the targeted file set.",
      recommendation:
        "If ClubOps stores member lists or sponsor contacts, document the intended access control model before onboarding real organizations.",
    },
    {
      severity: "low",
      category: "business",
      title: "Market positioning is promising but still broad",
      evidence: "The description names student organizations, events, members, and sponsor outreach, but does not yet specify the first buyer or strongest pain.",
      recommendation:
        "Lead with one wedge, such as clubs preparing for a new quarter or sponsorship season, and explain why existing spreadsheets fail.",
    },
  ],
  nextSteps: [
    "Add validation to API routes that accept event, member, or sponsor outreach data.",
    "Add an .env.example that documents required variables with safe placeholder values.",
    "Write a 3-step README setup path plus a demo account or seed-data note for reviewers.",
    "Configure missing security headers before inviting real clubs to test the app.",
    "Clarify whether the first customer is club officers, campus org boards, or student government groups.",
    "Record a 60-second workflow showing event creation, member tracking, and sponsor outreach in one connected flow.",
  ],
  positioningFeedback:
    "ClubOps has a credible early-stage wedge because campus clubs already juggle events, members, and sponsors across scattered tools. The positioning should get sharper about the first user: a club president preparing for a new quarter, a treasurer coordinating sponsors, or a campus program manager supporting many clubs. Lead with the operational pain and time saved, then show why the dashboard is more reliable than spreadsheets and group chats.",
  demoReadinessAdvice:
    "For a live demo, start with the student officer's problem: planning a quarter while membership and sponsor follow-up live in separate places. Show one clean workflow from event setup to member list to sponsor outreach, then use the LaunchGuard findings to explain what must be hardened before real clubs rely on it.",
  founderReadinessMemo: {
    productSummary:
      "ClubOps is a student-built SaaS dashboard for campus clubs to centralize event planning, member lists, and sponsor outreach before each quarter.",
    likelyTargetUser:
      "Likely target user: student club officers who manage events, members, and sponsorship outreach with lightweight tools.",
    coreUserPain:
      "Likely core pain: club operations are spread across spreadsheets, forms, messages, and old docs, making handoff and sponsor follow-up difficult.",
    credibilitySignals:
      "live demo responded with HTTP 200; package.json detected; lockfile detected; TypeScript signal detected; Prisma schema detected; deployment config detected",
    mainTechnicalRisk:
      "API routes were detected without a validation library signal, which is risky for member, event, and sponsor data collection.",
    mainMarketRisk:
      "The market story is plausible, but the first buyer/user and urgency need sharper proof before an investor or accelerator reviewer will see a clear wedge.",
    mentorInvestorQuestions: [
      "Which club role feels this pain most urgently: president, treasurer, event chair, or campus program staff?",
      "What does a club currently use instead, and where does that workflow break during the quarter?",
      "Would clubs pay individually, or is the better buyer a campus department, accelerator, or student government group?",
      "What data must be protected before real member lists or sponsor contacts are imported?",
    ],
  },
  launchPlan: {
    beforeSharingWithUsers: [
      "Add input validation for event, member, and sponsor outreach forms.",
      "Create a realistic demo workspace with sample club data instead of asking reviewers to start from a blank state.",
      "Clarify the first-screen promise around reducing club handoff and planning friction.",
    ],
    beforeShowingMentorsInvestors: [
      "Prepare a concise answer for who buys ClubOps and who uses it day to day.",
      "Show the current workaround: spreadsheets, group chats, forms, and disconnected sponsor notes.",
      "Explain which launch blockers are fixed now and which remain before campus-wide rollout.",
    ],
    beforeProductionLaunch: [
      "Add an .env.example and README setup path so technical reviewers can run the project safely.",
      "Configure missing security headers and document access-control assumptions.",
      "Add a privacy note for member lists and sponsor contact data before onboarding real clubs.",
    ],
  },
  launchSimulation: [
    {
      audience: "Founder self-check",
      likelyReaction:
        "The prototype has a clear workflow, but the next launch blocker is trust around setup, validation, and real club data.",
      concern: "The demo case study did not detect an .env.example or input validation library for detected API routes.",
      bestResponse:
        "Add safe env documentation, validate submitted data, and demo with realistic sample club records before inviting users.",
    },
    {
      audience: "Investor / mentor reaction",
      likelyReaction:
        "The product direction is understandable, but the buyer and urgency need sharper proof.",
      concern: "The description names campus clubs broadly but does not identify whether the first wedge is officers, sponsors, or campus programs.",
      bestResponse:
        "Lead with one painful quarterly workflow and bring 2-3 user quotes or examples showing why current tools fail.",
    },
    {
      audience: "Technical reviewer reaction",
      likelyReaction:
        "The app has a working deployment and database signal, but production readiness depends on validation, access control, and headers.",
      concern: "API routes were detected, but validation and auth/middleware signals were not detected in the targeted scan.",
      bestResponse:
        "Add validation, document the access-control plan, and configure baseline security headers before handling real member data.",
    },
    {
      audience: "Accelerator/program reviewer reaction",
      likelyReaction:
        "This could be useful for many student organizations, but the team needs a repeatable onboarding motion.",
      concern: "The case study shows a one-app workflow, while campus-wide adoption would require templates, permissions, and handoff support.",
      bestResponse:
        "Frame the roadmap around club templates, officer handoff, and cohort or campus-wide readiness reviews.",
    },
  ],
  checks: {
    repo: {
      owner: "campus-builder",
      name: "clubops",
      defaultBranch: "main",
      repoApiReachable: true,
      files: {},
      detectedFiles: ["README.md", "package.json", "pnpm-lock.yaml", "next.config.ts", "prisma/schema.prisma"],
      missingFiles: [".env.example", "middleware.ts", "src/middleware.ts"],
      apiRouteIndicators: { appApi: true, srcAppApi: false, pagesApi: false },
      dependencies: {
        next: true,
        react: true,
        typescript: true,
        prisma: true,
        "@prisma/client": true,
        tailwindcss: true,
        "lucide-react": true,
      },
    },
    liveUrl: {
      url: "https://clubops-demo.vercel.app",
      ok: true,
      status: 200,
      finalUrl: "https://clubops-demo.vercel.app",
      securityHeaders: {
        "content-security-policy": false,
        "x-frame-options": false,
        "x-content-type-options": true,
        "referrer-policy": true,
        "permissions-policy": false,
        "strict-transport-security": true,
      },
    },
    signals: {
      readmeExists: true,
      readmeHasSetupInstructions: true,
      packageJsonExists: true,
      envExampleExists: false,
      lockfileExists: true,
      authOrMiddlewareDetected: false,
      apiRoutesDetected: true,
      validationLibraryDetected: false,
      validationLibraries: [],
      databaseDetected: true,
      databaseSignals: ["prisma/schema.prisma", "prisma", "@prisma/client"],
      possibleSecretPatterns: [],
      productDescriptionClear: true,
      deploymentConfigDetected: true,
      typescriptDetected: true,
      readmeQuality: {
        hasSetupInstructions: false,
        hasEnvInstructions: false,
        hasDemoLink: true,
        hasProjectPurpose: true,
        hasScreenshotsOrVideo: false,
        hasLimitations: true,
      },
      descriptionQuality: {
        wordCount: 14,
        tooShort: false,
        hasTargetUser: true,
        hasProblem: true,
        hasValueProposition: true,
        featureOnly: false,
      },
    },
  },
};

const severityStyles: Record<TopFinding["severity"], string> = {
  critical: "border-red-200 bg-red-50 text-red-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const modeLabels: Record<AnalysisMode, string> = {
  "rule-based": "Rule-based demo mode",
  "ai-assisted": "AI-assisted synthesis",
  fallback: "Fallback mode",
};

const modeDescriptions: Record<AnalysisMode, string> = {
  "rule-based": "No API key required. The report is generated from deterministic repo and deployment checks.",
  "ai-assisted": "Deterministic scan evidence was synthesized with Gemini into this founder-ready report.",
  fallback: "AI synthesis was unavailable, so LaunchGuard returned the rule-based report.",
};

const audienceOptions: Array<{ value: ReportAudience; label: string }> = [
  { value: "founder", label: "Founder" },
  { value: "investor-mentor", label: "Investor / Mentor" },
  { value: "technical-reviewer", label: "Technical Reviewer" },
  { value: "accelerator", label: "Accelerator Program" },
];

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [description, setDescription] = useState("");
  const [reportAudience, setReportAudience] = useState<ReportAudience>("founder");
  const [report, setReport] = useState<ScanReport | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState("");
  const reportRef = useRef<HTMLElement | null>(null);

  const reportSummaryText = useMemo(() => (report ? buildCopyText(report, "summary") : ""), [report]);
  const topFindingsText = useMemo(() => (report ? buildCopyText(report, "findings") : ""), [report]);
  const nextStepsText = useMemo(() => (report ? buildCopyText(report, "steps") : ""), [report]);
  const founderBriefText = useMemo(() => (report ? buildFounderBrief(report) : ""), [report]);

  useEffect(() => {
    if (!report) {
      return;
    }

    reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [report]);

  async function runScan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setCopiedLabel("");

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repoUrl, liveUrl, description, reportAudience }),
      });
      const data = (await response.json()) as ScanReport | { error?: string };

      if (!response.ok) {
        throw new Error("error" in data && data.error ? data.error : "Launch audit could not be completed.");
      }

      setReport(data as ScanReport);
    } catch (scanError) {
      setError(
        scanError instanceof Error
          ? scanError.message
          : "Launch audit could not be completed. Check the repo URL and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function copyText(text: string, label: string) {
    if (!text) {
      return;
    }

    await navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    window.setTimeout(() => setCopiedLabel(""), 1800);
  }

  function fillSampleInputs() {
    setRepoUrl(sampleInputs.repoUrl);
    setLiveUrl(sampleInputs.liveUrl);
    setDescription(sampleInputs.description);
  }

  function loadDemoCaseStudy() {
    setReport(demoCaseStudyReport);
    setError("");
    setCopiedLabel("");
  }

  function resetAudit() {
    setReport(null);
    setError("");
    setCopiedLabel("");
    window.location.hash = "scan";
  }

  return (
    <main className="min-h-screen bg-[#f6f3ee] text-[#161513]">
      <section className="border-b border-black/10 bg-[#fbfaf7]">
        <div className="mx-auto grid min-h-screen w-full max-w-7xl gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:px-10 lg:py-10">
          <div className="flex flex-col justify-between gap-10">
            <nav className="flex items-center justify-between gap-4">
              <a href="#" className="flex items-center gap-2 text-sm font-semibold">
                <span className="flex size-9 items-center justify-center rounded-lg bg-[#161513] text-white">
                  <ShieldCheck size={18} aria-hidden="true" />
                </span>
                LaunchGuard AI
              </a>
              <a
                href="#scan"
                className="rounded-lg border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-[#161513] shadow-sm transition hover:border-black/30"
              >
                Start audit
              </a>
            </nav>

            <div className="max-w-2xl py-8 lg:py-12">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#0f766e]/20 bg-[#e8f4f1] px-3 py-1 text-sm font-medium text-[#0f766e]">
                <Sparkles size={15} aria-hidden="true" />
                No API key required
              </span>
              <h1 className="mt-7 text-5xl font-semibold leading-[1.02] tracking-normal text-[#161513] sm:text-6xl lg:text-7xl">
                LaunchGuard AI
              </h1>
              <p className="mt-5 max-w-xl text-2xl font-medium leading-8 text-[#3d3933]">
                Pre-launch technical diligence for early-stage web apps.
              </p>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-[#5c564d]">
                LaunchGuard helps early-stage builders find technical, security, UX, and positioning risks before
                showing their product to users, investors, or demo audiences.
              </p>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#6e665c]">
                It checks repo structure, docs, deployment health, security signals, validation/database/auth
                indicators, demo clarity, and positioning because working prototypes often still hide launch blockers.
              </p>
              <div className="mt-8 space-y-3">
                <div className="flex flex-wrap gap-3">
                  <a
                    href="#scan"
                    className="inline-flex h-12 items-center gap-2 rounded-lg bg-[#0f766e] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0b5f59]"
                  >
                    <Rocket size={18} aria-hidden="true" />
                    Run launch audit
                  </a>
                  <button
                    type="button"
                    onClick={loadDemoCaseStudy}
                    className="inline-flex h-12 items-center rounded-lg border border-black/15 bg-white px-5 text-sm font-semibold text-[#161513] shadow-sm transition hover:border-black/30"
                  >
                    Load demo case study
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-3 pb-3 sm:grid-cols-3">
              <SignalTile label="For founders" value="Before users see it" />
              <SignalTile label="For teams" value="Cohort readiness reviews" />
              <SignalTile label="For launches" value="Technical diligence memo" />
            </div>
          </div>

          <section
            id="scan"
            className="self-center rounded-2xl border border-black/10 bg-white p-5 shadow-[0_24px_80px_rgba(22,21,19,0.10)] sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#0f766e]">Pre-launch audit</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-normal">Scan an app</h2>
              </div>
              <span className="rounded-lg bg-[#f6f3ee] p-3 text-[#b45309]">
                <FileText size={22} aria-hidden="true" />
              </span>
            </div>

            <form onSubmit={runScan} className="mt-7 space-y-5">
              <Field label="GitHub repo URL" htmlFor="repo-url">
                <input
                  id="repo-url"
                  value={repoUrl}
                  onChange={(event) => setRepoUrl(event.target.value)}
                  placeholder="https://github.com/owner/repo"
                  required
                  className="h-12 w-full rounded-lg border border-black/15 bg-[#fbfaf7] px-4 text-base outline-none transition placeholder:text-[#8a8378] focus:border-[#0f766e] focus:bg-white focus:ring-4 focus:ring-[#0f766e]/10"
                />
              </Field>
              <Field label="Live demo URL" htmlFor="live-url">
                <input
                  id="live-url"
                  value={liveUrl}
                  onChange={(event) => setLiveUrl(event.target.value)}
                  placeholder="https://your-demo.vercel.app"
                  required
                  className="h-12 w-full rounded-lg border border-black/15 bg-[#fbfaf7] px-4 text-base outline-none transition placeholder:text-[#8a8378] focus:border-[#0f766e] focus:bg-white focus:ring-4 focus:ring-[#0f766e]/10"
                />
              </Field>
              <Field label="Product description" htmlFor="description">
                <textarea
                  id="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Who is it for, what launch risk does it reduce, and what outcome does it create?"
                  required
                  rows={5}
                  className="w-full resize-none rounded-lg border border-black/15 bg-[#fbfaf7] px-4 py-3 text-base leading-7 outline-none transition placeholder:text-[#8a8378] focus:border-[#0f766e] focus:bg-white focus:ring-4 focus:ring-[#0f766e]/10"
                />
              </Field>

              <Field label="Report audience" htmlFor="report-audience">
                <select
                  id="report-audience"
                  value={reportAudience}
                  onChange={(event) => setReportAudience(event.target.value as ReportAudience)}
                  className="h-12 w-full rounded-lg border border-black/15 bg-[#fbfaf7] px-4 text-base outline-none transition focus:border-[#0f766e] focus:bg-white focus:ring-4 focus:ring-[#0f766e]/10"
                >
                  {audienceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <p className="text-sm leading-6 text-[#6e665c]">
                Works with public GitHub repos. No private repo access, auth, database, or required API key.
              </p>

              {isLoading ? (
                <div className="rounded-lg border border-[#0f766e]/20 bg-[#e8f4f1] p-4 text-sm text-[#0f5f59]">
                  <div className="flex items-center gap-2 font-semibold">
                    <Loader2 className="animate-spin" size={17} aria-hidden="true" />
                    Running launch-readiness audit
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <LoadingStep label="Scanning targeted repo files" />
                    <LoadingStep label="Checking live deployment" />
                    <LoadingStep label="Generating report" />
                  </div>
                </div>
              ) : null}

              {error ? (
                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
                  <p>{error}</p>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#161513] px-5 text-sm font-semibold text-white transition hover:bg-[#2f2b26] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" size={18} aria-hidden="true" />
                  ) : (
                    <Rocket size={18} aria-hidden="true" />
                  )}
                  {isLoading ? "Running audit..." : "Run launch audit"}
                </button>
                <button
                  type="button"
                  onClick={fillSampleInputs}
                  className="inline-flex h-12 items-center justify-center rounded-lg border border-black/15 bg-[#fbfaf7] px-4 text-sm font-semibold transition hover:border-black/30"
                >
                  Try sample inputs
                </button>
              </div>
            </form>
          </section>
        </div>
      </section>

      {!report ? (
        <>
          <section className="border-b border-black/10 bg-[#f6f3ee]">
            <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
              <SectionIntro eyebrow="How it works" title="From repo evidence to launch report" />
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <AudienceCard
                  title="Collect evidence"
                  text="Scans public repo files, dependencies, docs, deployment status, and security headers."
                />
                <AudienceCard
                  title="Score readiness"
                  text="Converts technical and product signals into production, security, demo, and market-readiness scores."
                />
                <AudienceCard
                  title="Generate launch report"
                  text="Produces audience-specific findings, launch plan, founder memo, and brief."
                />
              </div>
            </div>
          </section>

          <section className="border-b border-black/10 bg-[#fbfaf7]">
            <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
              <SectionIntro eyebrow="Report output" title="What the report includes" />
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SignalTile label="Scores" value="Production, security, demo, market" />
                <SignalTile label="Risks" value="Evidence-backed launch blockers" />
                <SignalTile label="Memo" value="Founder-ready diligence summary" />
                <SignalTile label="Plan" value="Actions before users, mentors, launch" />
              </div>
            </div>
          </section>

          <section className="border-b border-black/10 bg-[#f6f3ee]">
            <div className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-8 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#0f766e]">
                  Why not just ChatGPT?
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-normal">Evidence first, synthesis second</h2>
              </div>
              <p className="text-base leading-7 text-[#5c564d]">
                LaunchGuard is not a generic prompt. It first collects structured evidence from the public repo and
                live deployment, then turns those deterministic signals into a diligence report for the audience you
                choose.
              </p>
            </div>
          </section>

          <section className="border-b border-black/10 bg-[#f6f3ee]">
            <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
              <SectionIntro eyebrow="Who uses this" title="Built for early launch reviews" />
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <AudienceCard
                  title="Student founders"
                  text="Prepare a prototype for mentors, judges, users, or first investor conversations without missing obvious launch blockers."
                />
                <AudienceCard
                  title="Indie hackers"
                  text="Run a quick diligence pass before posting a side project, collecting emails, or sharing a live demo publicly."
                />
                <AudienceCard
                  title="Accelerators and clubs"
                  text="Review cohort projects with a consistent technical-readiness lens before demo days or showcase events."
                />
              </div>
            </div>
          </section>

          <section className="border-b border-black/10 bg-[#fbfaf7]">
            <div className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-8 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:px-10">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#0f766e]">Workflow</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-normal">Built for a real workflow</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <SignalTile label="Free" value="Public launch audits for early builders" />
                <SignalTile label="Pro" value="Deeper scans, exports, and saved diligence reports" />
                <SignalTile label="Teams" value="Cohort readiness reviews for accelerators and clubs" />
              </div>
            </div>
          </section>
        </>
      ) : null}

      {report ? (
        <section ref={reportRef} className="mx-auto w-full max-w-7xl scroll-mt-6 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
          <div className="grid items-start gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="self-start rounded-2xl border border-black/10 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#0f766e]">
                    Overall launch readiness
                  </p>
                  <div className="mt-4 flex items-end gap-3">
                    <span className="text-7xl font-semibold tracking-normal">{report.overallScore}</span>
                    <span className="pb-3 text-xl font-medium text-[#6e665c]">/100</span>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <ScoreBadge score={report.overallScore} />
                  <AnalysisBadge mode={report.analysisMode} />
                  <span className="rounded-full border border-black/10 bg-[#fbfaf7] px-3 py-1 text-sm font-bold text-[#5c564d]">
                    {getAudienceLabel(report.reportAudience)} audience
                  </span>
                </div>
              </div>
              <p className="mt-5 text-base leading-7 text-[#5c564d]">{getLeadSentence(report.summary)}</p>
              <p className="mt-3 text-sm leading-6 text-[#6e665c]">{modeDescriptions[report.analysisMode]}</p>
              {report.analysisNote ? <p className="mt-2 text-sm leading-6 text-[#6e665c]">{report.analysisNote}</p> : null}
              <div className="mt-5 rounded-xl bg-[#fbfaf7] p-4">
                <p className="text-sm font-semibold text-[#3d3933]">Top 3 launch blockers</p>
                <div className="mt-3 space-y-2">
                  {report.topFindings.slice(0, 3).map((finding) => (
                    <div key={`${finding.category}-${finding.title}`} className="flex gap-2 text-sm leading-6 text-[#5c564d]">
                      <AlertTriangle className="mt-1 shrink-0 text-[#b45309]" size={15} aria-hidden="true" />
                      <p>{finding.title}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <CopyButton
                  label="Copy report summary"
                  copied={copiedLabel === "summary"}
                  onClick={() => copyText(reportSummaryText, "summary")}
                />
                <CopyButton
                  label="Copy top findings"
                  copied={copiedLabel === "findings"}
                  onClick={() => copyText(topFindingsText, "findings")}
                />
                <CopyButton
                  label="Copy next steps"
                  copied={copiedLabel === "steps"}
                  onClick={() => copyText(nextStepsText, "steps")}
                />
                <CopyButton
                  label="Copy Founder Brief"
                  copied={copiedLabel === "founder-brief"}
                  onClick={() => copyText(founderBriefText, "founder-brief")}
                />
                <button
                  type="button"
                  onClick={resetAudit}
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-black/15 bg-[#fbfaf7] px-4 text-sm font-semibold transition hover:border-black/30"
                >
                  <RefreshCw size={17} aria-hidden="true" />
                  Run another audit
                </button>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <MetricCard icon={<Server size={20} />} label="Production" score={report.productionScore} />
              <MetricCard icon={<ShieldCheck size={20} />} label="Security" score={report.securityScore} />
              <MetricCard icon={<Globe2 size={20} />} label="Demo clarity" score={report.demoClarityScore} />
              <MetricCard
                icon={<Users size={20} />}
                label="Market readiness"
                score={report.businessFeasibilityScore}
                subtitle="Target user, pain, value, and credibility"
              />
            </section>
          </div>

          <div className="mt-5 space-y-5">
            <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold tracking-normal">Top findings</h2>
                <span className="rounded-full bg-[#f6f3ee] px-3 py-1 text-sm font-medium text-[#6e665c]">
                  {report.topFindings.length} generated
                </span>
              </div>
              <div className="mt-5 space-y-4">
                {report.topFindings.map((finding) => (
                  <FindingCard key={`${finding.category}-${finding.title}`} finding={finding} />
                ))}
              </div>
            </section>

            <FounderMemo memo={report.founderReadinessMemo} />
            <LaunchPlan plan={report.launchPlan} />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2 lg:items-start">
            <div className="space-y-5">
              <LaunchSimulation simulation={report.launchSimulation} />
              <AdviceCard title="Positioning feedback" text={report.positioningFeedback} />
            </div>

            <div className="space-y-5">
              <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold tracking-normal">Next steps</h2>
                <div className="mt-5 space-y-3">
                  {report.nextSteps.map((step) => (
                    <div key={step} className="flex gap-3 text-sm leading-6 text-[#4f493f]">
                      <CheckCircle2 className="mt-0.5 shrink-0 text-[#0f766e]" size={18} aria-hidden="true" />
                      <p>{step}</p>
                    </div>
                  ))}
                </div>
              </section>
              <AdviceCard title="Demo readiness advice" text={report.demoReadinessAdvice} />
            </div>
          </div>
        </section>
      ) : null}
      <footer className="border-t border-black/10 bg-[#161513] px-5 py-8 text-white sm:px-8 lg:px-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold">LaunchGuard AI</p>
          <p className="text-sm text-white/70">Pre-launch technical diligence grounded in repo and deployment evidence.</p>
        </div>
      </footer>
    </main>
  );
}

function buildFounderBrief(report: ScanReport) {
  const memo = report.founderReadinessMemo;
  const topFindings = report.topFindings
    .slice(0, 3)
    .map((finding) => `- [${finding.severity.toUpperCase()}] ${finding.title}: ${finding.recommendation}`)
    .join("\n");
  const nextActions = report.nextSteps
    .slice(0, 3)
    .map((step) => `- ${step}`)
    .join("\n");
  const questions = memo.mentorInvestorQuestions.map((question) => `- ${question}`).join("\n");
  const simulation = report.launchSimulation
    .map((item) => `- ${item.audience}: ${item.likelyReaction} Concern: ${item.concern}`)
    .join("\n");

  return [
    `LaunchGuard Founder Brief: ${report.checks.repo.owner}/${report.checks.repo.name}`,
    `Audience: ${getAudienceLabel(report.reportAudience)}`,
    `Overall score: ${report.overallScore}/100`,
    `Production: ${report.productionScore}/100`,
    `Security: ${report.securityScore}/100`,
    `Demo clarity: ${report.demoClarityScore}/100`,
    `Market readiness: ${report.businessFeasibilityScore}/100`,
    "",
    `Target user: ${memo.likelyTargetUser}`,
    `Core user pain: ${memo.coreUserPain}`,
    `Main technical risk: ${memo.mainTechnicalRisk}`,
    `Main market risk: ${memo.mainMarketRisk}`,
    "",
    "Top 3 launch blockers:",
    topFindings || "- No major blockers generated from the targeted checks.",
    "",
    "Top 3 next actions:",
    nextActions,
    "",
    "Mentor / investor questions:",
    questions,
    "",
    "Launch simulation:",
    simulation,
  ].join("\n");
}

function getAudienceLabel(audience: ReportAudience) {
  return audienceOptions.find((option) => option.value === audience)?.label ?? "Founder";
}

function getLeadSentence(text: string) {
  const firstSentenceBreak = text.indexOf(". ");

  if (firstSentenceBreak === -1) {
    return text;
  }

  return text.slice(0, firstSentenceBreak + 1);
}

function buildCopyText(report: ScanReport, mode: "summary" | "findings" | "steps") {
  const scoreBreakdown = [
    `Production: ${report.productionScore}/100`,
    `Security: ${report.securityScore}/100`,
    `Demo clarity: ${report.demoClarityScore}/100`,
    `Market readiness: ${report.businessFeasibilityScore}/100`,
  ].join("\n");
  const findings = report.topFindings
    .slice(0, mode === "findings" ? 8 : 3)
    .map((finding) => `- [${finding.severity.toUpperCase()}] ${finding.title}: ${finding.recommendation}`)
    .join("\n");
  const steps = report.nextSteps
    .slice(0, mode === "steps" ? 6 : 3)
    .map((step) => `- ${step}`)
    .join("\n");

  if (mode === "findings") {
    return `LaunchGuard AI top findings\n${findings}`;
  }

  if (mode === "steps") {
    return `LaunchGuard AI founder next steps\n${steps}`;
  }

  return [
    `LaunchGuard AI report for ${report.checks.repo.owner}/${report.checks.repo.name}`,
    `Overall score: ${report.overallScore}/100`,
    scoreBreakdown,
    "",
    report.summary,
    "",
    "Top 3 findings:",
    findings || "- No major findings generated from the current deterministic checks.",
    "",
    "Next 3 steps:",
    steps,
  ].join("\n");
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="mb-2 block text-sm font-semibold text-[#3d3933]">{label}</span>
      {children}
    </label>
  );
}

function SignalTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white/70 p-4">
      <p className="text-sm font-medium text-[#6e665c]">{label}</p>
      <p className="mt-1 text-base font-semibold text-[#161513]">{value}</p>
    </div>
  );
}

function SectionIntro({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#0f766e]">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-normal">{title}</h2>
    </div>
  );
}

function AudienceCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold tracking-normal">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#5c564d]">{text}</p>
    </article>
  );
}

function LoadingStep({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2">
      <CheckCircle2 size={15} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  score,
  subtitle,
}: {
  icon: ReactNode;
  label: string;
  score: number;
  subtitle?: string;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <span className="rounded-lg bg-[#e8f4f1] p-3 text-[#0f766e]">{icon}</span>
        <span className="text-3xl font-semibold tracking-normal">{score}</span>
      </div>
      <p className="mt-4 text-sm font-semibold text-[#3d3933]">{label}</p>
      {subtitle ? <p className="mt-1 text-xs leading-5 text-[#6e665c]">{subtitle}</p> : null}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eee8df]">
        <div className="h-full rounded-full bg-[#0f766e]" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function FounderMemo({ memo }: { memo: ScanReport["founderReadinessMemo"] }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold tracking-normal">Founder Readiness Memo</h2>
      <div className="mt-5 space-y-4">
        <MemoItem label="Product summary" text={memo.productSummary} />
        <MemoItem label="Likely target user" text={memo.likelyTargetUser} />
        <MemoItem label="Core user pain" text={memo.coreUserPain} />
        <MemoItem label="Credibility signals" text={memo.credibilitySignals} />
        <MemoItem label="Main technical risk" text={memo.mainTechnicalRisk} />
        <MemoItem label="Main market risk" text={memo.mainMarketRisk} />
      </div>
      <div className="mt-5 rounded-xl bg-[#fbfaf7] p-4">
        <p className="text-sm font-semibold text-[#3d3933]">Mentor / investor questions</p>
        <div className="mt-3 space-y-2">
          {memo.mentorInvestorQuestions.map((question) => (
            <div key={question} className="flex gap-2 text-sm leading-6 text-[#5c564d]">
              <CheckCircle2 className="mt-1 shrink-0 text-[#0f766e]" size={15} aria-hidden="true" />
              <p>{question}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LaunchPlan({ plan }: { plan: ScanReport["launchPlan"] }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold tracking-normal">Launch Plan</h2>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <PlanGroup title="Before sharing with users" items={plan.beforeSharingWithUsers} />
        <PlanGroup title="Before showing mentors/investors" items={plan.beforeShowingMentorsInvestors} />
        <PlanGroup title="Before production launch" items={plan.beforeProductionLaunch} />
      </div>
    </section>
  );
}

function LaunchSimulation({ simulation }: { simulation: ScanReport["launchSimulation"] }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold tracking-normal">Launch Simulation</h2>
      <p className="mt-3 text-sm leading-6 text-[#6e665c]">
        What different audiences would likely notice if this app were shown today, based on the targeted scan.
      </p>
      <div className="mt-5 space-y-4">
        {simulation.map((item) => (
          <article key={item.audience} className="rounded-xl bg-[#fbfaf7] p-4">
            <h3 className="text-sm font-semibold text-[#3d3933]">{item.audience}</h3>
            <p className="mt-3 text-sm leading-6 text-[#4f493f]">
              <span className="font-semibold">Likely reaction: </span>
              {item.likelyReaction}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#5c564d]">
              <span className="font-semibold">Concern: </span>
              {item.concern}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#5c564d]">
              <span className="font-semibold">Best response: </span>
              {item.bestResponse}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function PlanGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl bg-[#fbfaf7] p-4">
      <h3 className="text-sm font-semibold text-[#3d3933]">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item} className="flex gap-2 text-sm leading-6 text-[#5c564d]">
            <CheckCircle2 className="mt-1 shrink-0 text-[#0f766e]" size={15} aria-hidden="true" />
            <p>{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MemoItem({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#8a8378]">{label}</p>
      <p className="mt-1 text-sm leading-6 text-[#4f493f]">{text}</p>
    </div>
  );
}

function FindingCard({ finding }: { finding: TopFinding }) {
  return (
    <article className="rounded-xl border border-black/10 bg-[#fbfaf7] p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-[0.08em] ${
            severityStyles[finding.severity]
          }`}
        >
          {finding.severity}
        </span>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#6e665c]">
          {finding.category}
        </span>
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-normal">{finding.title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#6e665c]">{finding.evidence}</p>
      <p className="mt-3 text-sm leading-6 text-[#3d3933]">{finding.recommendation}</p>
    </article>
  );
}

function AdviceCard({ title, text }: { title: string; text: string }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold tracking-normal">{title}</h2>
      <p className="mt-4 text-sm leading-6 text-[#5c564d]">{text}</p>
    </section>
  );
}

function CopyButton({ label, copied, onClick }: { label: string; copied: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 items-center gap-2 rounded-lg border border-black/15 bg-[#fbfaf7] px-4 text-sm font-semibold transition hover:border-black/30"
    >
      {copied ? <CheckCircle2 size={17} aria-hidden="true" /> : <Clipboard size={17} aria-hidden="true" />}
      {copied ? "Copied" : label}
    </button>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const label = score >= 82 ? "Ready soon" : score >= 65 ? "Needs polish" : "Fix blockers";
  const className =
    score >= 82
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : score >= 65
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : "bg-red-50 text-red-700 border-red-200";

  return <span className={`rounded-full border px-3 py-1 text-sm font-bold ${className}`}>{label}</span>;
}

function AnalysisBadge({ mode }: { mode: AnalysisMode }) {
  const className =
    mode === "ai-assisted"
      ? "border-[#0f766e]/25 bg-[#e8f4f1] text-[#0f766e]"
      : mode === "fallback"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-black/10 bg-[#f6f3ee] text-[#5c564d]";

  return <span className={`rounded-full border px-3 py-1 text-sm font-bold ${className}`}>{modeLabels[mode]}</span>;
}
