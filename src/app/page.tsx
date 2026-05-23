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
import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import type { AnalysisMode, ReportAudience, ScanReport, TopFinding } from "@/app/types";

const sampleInputs = {
  repoUrl: "github.com/owner/repo",
  liveUrl: "https://your-demo.vercel.app",
  description:
    "LaunchGuard AI helps student founders and indie hackers catch launch blockers before sharing web apps with users, investors, or demo audiences.",
};

const sampleReport: ScanReport = {
  analysisMode: "rule-based",
  analysisNote: "Sample report for demo reliability. No external request was made.",
  reportAudience: "founder",
  overallScore: 78,
  productionScore: 76,
  securityScore: 72,
  demoClarityScore: 83,
  businessFeasibilityScore: 82,
  summary:
    "sample-founder/app scored 78/100 for launch readiness. The live demo responded with HTTP 200. Strongest area: demo clarity (83/100). Biggest risk from the targeted scan: Security headers were not fully detected. Recommended next fix: Add baseline browser protections such as CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and HSTS where appropriate.",
  topFindings: [
    {
      severity: "medium",
      category: "security",
      title: "Security headers were not fully detected",
      evidence: "Not detected on the live response: content-security-policy, permissions-policy.",
      recommendation:
        "Add baseline browser protections through your hosting platform or Next.js headers config before launch.",
    },
    {
      severity: "medium",
      category: "infrastructure",
      title: "Environment variable example file was not detected",
      evidence: ".env.example was not found in the targeted file set.",
      recommendation:
        "Add an .env.example that documents required variables with placeholder values and no real credentials.",
    },
    {
      severity: "low",
      category: "documentation",
      title: "README demo evidence could be stronger",
      evidence: "README.md was detected, but screenshot/video language was not detected.",
      recommendation:
        "Add a screenshot or short demo link so a first-time reviewer understands the product quickly.",
    },
  ],
  nextSteps: [
    "Add an .env.example that documents required variables with placeholder values.",
    "Add missing security headers where appropriate for the deployed app.",
    "Record the primary user workflow and keep the demo explanation focused on the launch blocker being solved.",
  ],
  positioningFeedback:
    "The sample positioning has a clear audience and launch pain. To make it stronger, add why this matters now and what evidence makes the product trustworthy.",
  demoReadinessAdvice:
    "For a screen recording, start on the first screen a real user would see, complete one primary workflow, then show the LaunchGuard report as the pre-launch checklist. Keep limitations honest and brief.",
  founderReadinessMemo: {
    productSummary:
      "Based on the submitted description, this product helps early-stage builders identify launch blockers before sharing a prototype.",
    likelyTargetUser: "Likely target user: student founders, indie hackers, and early startup teams preparing to demo.",
    coreUserPain:
      "Likely core pain: working prototypes can still have technical, security, UX, or positioning gaps that hurt first impressions.",
    credibilitySignals:
      "live demo responded with HTTP 200; package.json detected; lockfile detected; TypeScript signal detected; validation signal detected (zod)",
    mainTechnicalRisk:
      "Security headers were not fully detected: Add baseline browser protections through hosting or Next.js config.",
    mainMarketRisk:
      "Market story is directionally clear, but it should explain why the target user cares enough to run an audit before launch.",
    mentorInvestorQuestions: [
      "Who feels this launch-readiness pain most urgently?",
      "What does the user currently do before showing a prototype?",
      "What evidence proves this catches issues they would otherwise miss?",
    ],
  },
  launchPlan: {
    beforeSharingWithUsers: [
      "Run the primary user workflow on the live URL in a fresh browser session.",
      "Put the clearest user pain and outcome on the first screen.",
      "Add a live demo link or screenshot so a first-time visitor understands the product quickly.",
    ],
    beforeShowingMentorsInvestors: [
      "Prepare a concise answer for the main technical risk and main market risk.",
      "Make sure the README explains the problem, setup, demo path, and known limitations.",
      "Explain why this user segment cares now and what they do today instead.",
    ],
    beforeProductionLaunch: [
      "Add an .env.example so another developer can run the project safely.",
      "Document how user input is validated before accepting user-submitted data.",
      "Add missing security headers before production launch.",
    ],
  },
  checks: {
    repo: {
      owner: "sample-founder",
      name: "app",
      defaultBranch: "main",
      repoApiReachable: true,
      files: {},
      detectedFiles: ["README.md", "package.json", "pnpm-lock.yaml", "next.config.ts"],
      missingFiles: [".env.example", "middleware.ts"],
      apiRouteIndicators: { appApi: true, srcAppApi: false, pagesApi: false },
      dependencies: { next: true, react: true, typescript: true, zod: true, tailwindcss: true },
    },
    liveUrl: {
      url: "https://sample-launchguard-demo.vercel.app",
      ok: true,
      status: 200,
      finalUrl: "https://sample-launchguard-demo.vercel.app",
      securityHeaders: {
        "content-security-policy": false,
        "x-frame-options": true,
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
      validationLibraryDetected: true,
      validationLibraries: ["zod"],
      databaseDetected: false,
      databaseSignals: [],
      possibleSecretPatterns: [],
      productDescriptionClear: true,
      deploymentConfigDetected: true,
      typescriptDetected: true,
      readmeQuality: {
        hasSetupInstructions: true,
        hasEnvInstructions: false,
        hasDemoLink: true,
        hasProjectPurpose: true,
        hasScreenshotsOrVideo: false,
        hasLimitations: true,
      },
      descriptionQuality: {
        wordCount: 18,
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

  const reportSummaryText = useMemo(() => (report ? buildCopyText(report, "summary") : ""), [report]);
  const topFindingsText = useMemo(() => (report ? buildCopyText(report, "findings") : ""), [report]);
  const nextStepsText = useMemo(() => (report ? buildCopyText(report, "steps") : ""), [report]);
  const founderBriefText = useMemo(() => (report ? buildFounderBrief(report) : ""), [report]);

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

  function loadSampleReport() {
    setReport(sampleReport);
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
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#scan"
                  className="inline-flex h-12 items-center gap-2 rounded-lg bg-[#0f766e] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0b5f59]"
                >
                  <Rocket size={18} aria-hidden="true" />
                  Run launch audit
                </a>
                <button
                  type="button"
                  onClick={loadSampleReport}
                  className="inline-flex h-12 items-center rounded-lg border border-black/15 bg-white px-5 text-sm font-semibold text-[#161513] shadow-sm transition hover:border-black/30"
                >
                  Load sample report
                </button>
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

      <section className="border-b border-black/10 bg-[#f6f3ee]">
        <div className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-10 sm:px-8 lg:grid-cols-3 lg:px-10">
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
      </section>

      <section className="border-b border-black/10 bg-[#fbfaf7]">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-10 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:px-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#0f766e]">Business model</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal">Why this could be a startup</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <SignalTile label="Free" value="Public repo audits for early builders" />
            <SignalTile label="Pro" value="Deeper scans, exports, and diligence reports" />
            <SignalTile label="Teams" value="Accelerator cohort readiness reviews" />
          </div>
        </div>
      </section>

      <section className="border-b border-black/10 bg-[#f6f3ee]">
        <div className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-10 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#0f766e]">
              Why not just ChatGPT?
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal">Evidence first, synthesis second</h2>
          </div>
          <p className="text-base leading-7 text-[#5c564d]">
            LaunchGuard is not a generic prompt. It first collects structured evidence from the public repo and live
            deployment, then turns those deterministic signals into a diligence report for the audience you choose.
          </p>
        </div>
      </section>

      {report ? (
        <section className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
          <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
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
                </div>
              </div>
              <p className="mt-5 text-base leading-7 text-[#5c564d]">{report.summary}</p>
              <p className="mt-3 text-sm leading-6 text-[#6e665c]">{modeDescriptions[report.analysisMode]}</p>
              {report.analysisNote ? <p className="mt-2 text-sm leading-6 text-[#6e665c]">{report.analysisNote}</p> : null}
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

          <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
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

            <div className="space-y-5">
              <FounderMemo memo={report.founderReadinessMemo} />
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

              <AdviceCard title="Positioning feedback" text={report.positioningFeedback} />
              <AdviceCard title="Demo readiness advice" text={report.demoReadinessAdvice} />
            </div>
          </div>

          <LaunchPlan plan={report.launchPlan} />
        </section>
      ) : null}
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

  return [
    `LaunchGuard Founder Brief: ${report.checks.repo.owner}/${report.checks.repo.name}`,
    `Audience: ${audienceOptions.find((option) => option.value === report.reportAudience)?.label ?? "Founder"}`,
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
  ].join("\n");
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
    <section className="mt-5 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold tracking-normal">Launch Plan</h2>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <PlanGroup title="Before sharing with users" items={plan.beforeSharingWithUsers} />
        <PlanGroup title="Before showing mentors/investors" items={plan.beforeShowingMentorsInvestors} />
        <PlanGroup title="Before production launch" items={plan.beforeProductionLaunch} />
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
