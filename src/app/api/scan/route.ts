import type { ReportAudience, ScanChecks, ScanReport, SecretPattern, TopFinding } from "@/app/types";

type ScanRequest = {
  repoUrl?: string;
  liveUrl?: string;
  description?: string;
  reportAudience?: ReportAudience;
};

type RepoRef = {
  owner: string;
  repo: string;
};

type FetchedFile = {
  path: string;
  detected: boolean;
  status?: number;
  bytes?: number;
  branch?: string;
  text?: string;
  snippet?: string;
};

type ReadmeQuality = ScanChecks["signals"]["readmeQuality"];
type DescriptionQuality = ScanChecks["signals"]["descriptionQuality"];
type SynthesisPatch = Pick<
  ScanReport,
  | "summary"
  | "positioningFeedback"
  | "demoReadinessAdvice"
  | "nextSteps"
  | "founderReadinessMemo"
  | "launchPlan"
  | "launchSimulation"
>;

const TARGET_FILES = [
  "README.md",
  "package.json",
  "next.config.js",
  "next.config.ts",
  "middleware.ts",
  "proxy.ts",
  "src/middleware.ts",
  "src/proxy.ts",
  "prisma/schema.prisma",
  ".env.example",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "app/api/route.ts",
  "src/app/api/route.ts",
  "pages/api/hello.ts",
  "pages/api/index.ts",
  "drizzle.config.ts",
  "supabase/config.toml",
  "vercel.json",
] as const;

const SECURITY_HEADERS = [
  "content-security-policy",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "strict-transport-security",
] as const;

const DEPENDENCIES_TO_DETECT = [
  "next",
  "react",
  "typescript",
  "prisma",
  "@prisma/client",
  "drizzle-orm",
  "@supabase/supabase-js",
  "zod",
  "yup",
  "joi",
  "valibot",
  "clerk",
  "@clerk/nextjs",
  "next-auth",
  "better-auth",
  "lucide-react",
  "tailwindcss",
] as const;

const VALIDATION_LIBRARIES = ["zod", "yup", "valibot", "joi"] as const;
const DATABASE_SIGNALS = ["prisma", "@prisma/client", "supabase", "drizzle", "neon"] as const;
const GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GEMINI_TIMEOUT_MS = 30000;

const severityRank: Record<TopFinding["severity"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export async function POST(request: Request) {
  let body: ScanRequest;

  try {
    body = (await request.json()) as ScanRequest;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const description = body.description?.trim() ?? "";
  const reportAudience = parseReportAudience(body.reportAudience);
  const repoParseResult = parseGitHubRepoUrl(body.repoUrl ?? "");
  const liveParseResult = parseHttpUrl(body.liveUrl ?? "");

  if (!repoParseResult.ok) {
    return Response.json({ error: repoParseResult.error }, { status: 400 });
  }

  if (!liveParseResult.ok) {
    return Response.json({ error: liveParseResult.error }, { status: 400 });
  }

  const deterministicReport = await buildRuleBasedReport(repoParseResult.repo, liveParseResult.url, description, reportAudience);
  const finalReport = await maybeSynthesizeWithGemini(deterministicReport, description, reportAudience);
  console.info("[LaunchGuard] final analysisMode:", finalReport.analysisMode);

  return Response.json(finalReport);
}

async function buildRuleBasedReport(
  repoRef: RepoRef,
  liveUrl: string,
  description: string,
  reportAudience: ReportAudience,
): Promise<ScanReport> {
  const repoMeta = await fetchRepoMeta(repoRef);
  const branches = unique([repoMeta.defaultBranch, "main", "master"].filter(Boolean) as string[]);
  const defaultBranch = repoMeta.defaultBranch ?? "main";
  const fetchedFiles = await fetchTargetFiles(repoRef, branches);
  const apiRouteIndicators = await detectApiRouteIndicators(repoRef, branches, fetchedFiles);
  const liveResult = await fetchLiveUrl(liveUrl);
  const fileMap = Object.fromEntries(fetchedFiles.map((file) => [file.path, file]));
  const packageJsonText = fileMap["package.json"]?.text ?? "";
  const readmeText = fileMap["README.md"]?.text ?? "";
  const dependencies = parseDependencySignals(packageJsonText);
  const combinedRepoText = fetchedFiles
    .filter((file) => !isLockfile(file.path))
    .map((file) => file.text ?? "")
    .join("\n");
  const validationLibraries = VALIDATION_LIBRARIES.filter(
    (library) => dependencies[library] || hasKeyword(combinedRepoText, library),
  );
  const databaseSignals = DATABASE_SIGNALS.filter((signal) => {
    if (signal === "supabase") {
      return dependencies["@supabase/supabase-js"] || hasKeyword(combinedRepoText, "supabase");
    }

    if (signal === "drizzle") {
      return dependencies["drizzle-orm"] || hasKeyword(combinedRepoText, "drizzle");
    }

    return dependencies[signal] || hasKeyword(combinedRepoText, signal);
  });
  const detectedFiles = fetchedFiles.filter((file) => file.detected).map((file) => file.path);
  const missingFiles = fetchedFiles.filter((file) => !file.detected).map((file) => file.path);
  const apiRoutesDetected =
    apiRouteIndicators.appApi || apiRouteIndicators.srcAppApi || apiRouteIndicators.pagesApi;
  const authOrMiddlewareDetected =
    Boolean(
      fileMap["middleware.ts"]?.detected ||
        fileMap["proxy.ts"]?.detected ||
        fileMap["src/middleware.ts"]?.detected ||
        fileMap["src/proxy.ts"]?.detected ||
        dependencies["@clerk/nextjs"] ||
        dependencies["clerk"] ||
        dependencies["next-auth"] ||
        dependencies["better-auth"],
    ) || /\b(auth|session|jwt|middleware|protected route)\b/i.test(combinedRepoText);
  const readmeQuality = analyzeReadme(readmeText);
  const descriptionQuality = analyzeDescription(description);
  const possibleSecretPatterns = findPossibleSecretPatterns(fetchedFiles);

  const checks: ScanChecks = {
    repo: {
      owner: repoRef.owner,
      name: repoRef.repo,
      defaultBranch,
      repoApiReachable: repoMeta.ok,
      files: Object.fromEntries(
        fetchedFiles.map((file) => [
          file.path,
          {
            detected: file.detected,
            path: file.path,
            status: file.status,
            bytes: file.bytes,
            branch: file.branch,
            snippet: file.snippet,
          },
        ]),
      ),
      detectedFiles,
      missingFiles,
      apiRouteIndicators,
      dependencies,
    },
    liveUrl: {
      url: liveUrl,
      ok: liveResult.ok,
      status: liveResult.status,
      finalUrl: liveResult.finalUrl,
      error: liveResult.error,
      securityHeaders: liveResult.securityHeaders,
    },
    signals: {
      readmeExists: Boolean(fileMap["README.md"]?.detected),
      readmeHasSetupInstructions: readmeQuality.hasSetupInstructions,
      packageJsonExists: Boolean(fileMap["package.json"]?.detected),
      envExampleExists: Boolean(fileMap[".env.example"]?.detected),
      lockfileExists: Boolean(
        fileMap["package-lock.json"]?.detected ||
          fileMap["pnpm-lock.yaml"]?.detected ||
          fileMap["yarn.lock"]?.detected,
      ),
      authOrMiddlewareDetected,
      apiRoutesDetected,
      validationLibraryDetected: validationLibraries.length > 0,
      validationLibraries,
      databaseDetected: Boolean(
        fileMap["prisma/schema.prisma"]?.detected ||
          fileMap["drizzle.config.ts"]?.detected ||
          fileMap["supabase/config.toml"]?.detected ||
          databaseSignals.length > 0,
      ),
      databaseSignals,
      possibleSecretPatterns,
      productDescriptionClear:
        descriptionQuality.hasTargetUser &&
        descriptionQuality.hasProblem &&
        descriptionQuality.hasValueProposition &&
        !descriptionQuality.tooShort,
      deploymentConfigDetected: Boolean(
        fileMap["vercel.json"]?.detected || fileMap["next.config.js"]?.detected || fileMap["next.config.ts"]?.detected,
      ),
      typescriptDetected: Boolean(dependencies["typescript"] || fileMap["next.config.ts"]?.detected),
      readmeQuality,
      descriptionQuality,
    },
  };

  const scores = calculateScores(checks);
  const topFindings = buildFindings(checks, description);
  const founderReadinessMemo = buildFounderReadinessMemo(checks, topFindings, description, reportAudience);
  const launchPlan = buildLaunchPlan(checks, topFindings);

  return {
    analysisMode: "rule-based",
    analysisNote: "Generated with deterministic checks. Optional AI synthesis can be enabled later with GEMINI_API_KEY.",
    reportAudience,
    ...scores,
    founderReadinessMemo,
    launchPlan,
    launchSimulation: buildLaunchSimulation(checks, topFindings, founderReadinessMemo, launchPlan),
    summary: buildSummary(checks, scores, topFindings, reportAudience),
    topFindings,
    nextSteps: buildNextSteps(checks, topFindings, reportAudience),
    positioningFeedback: buildPositioningFeedback(checks, description),
    demoReadinessAdvice: buildDemoReadinessAdvice(checks, reportAudience),
    checks,
  };
}

function parseReportAudience(value: unknown): ReportAudience {
  const allowed: ReportAudience[] = ["founder", "investor-mentor", "technical-reviewer", "accelerator"];
  return allowed.includes(value as ReportAudience) ? (value as ReportAudience) : "founder";
}

function parseGitHubRepoUrl(input: string): { ok: true; repo: RepoRef } | { ok: false; error: string } {
  const trimmed = input.trim().replace(/\/+$/, "");

  if (!trimmed) {
    return { ok: false, error: "Enter a public GitHub repo URL, for example https://github.com/owner/repo." };
  }

  const ownerRepoMatch = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/);
  if (ownerRepoMatch) {
    return { ok: true, repo: { owner: ownerRepoMatch[1], repo: ownerRepoMatch[2] } };
  }

  try {
    const candidate = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(candidate);
    const host = url.hostname.toLowerCase();

    if (host !== "github.com" && host !== "www.github.com") {
      return { ok: false, error: "LaunchGuard currently supports public repositories hosted on github.com." };
    }

    const [owner, repoWithSuffix] = url.pathname.split("/").filter(Boolean);
    const repo = repoWithSuffix?.replace(/\.git$/i, "");

    if (!owner || !repo) {
      return { ok: false, error: "GitHub URL should look like https://github.com/owner/repo." };
    }

    return { ok: true, repo: { owner, repo } };
  } catch {
    return { ok: false, error: "Enter a valid GitHub repo URL, such as github.com/owner/repo." };
  }
}

function parseHttpUrl(input: string): { ok: true; url: string } | { ok: false; error: string } {
  const trimmed = input.trim();

  if (!trimmed) {
    return { ok: false, error: "Enter a live demo URL so LaunchGuard can check deployment readiness." };
  }

  try {
    const normalized = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(normalized);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { ok: false, error: "Live demo URL must use http or https." };
    }

    return { ok: true, url: url.toString() };
  } catch {
    return { ok: false, error: "Enter a valid live demo URL, for example https://your-demo.vercel.app." };
  }
}

async function fetchRepoMeta(repoRef: RepoRef): Promise<{ ok: boolean; defaultBranch?: string }> {
  try {
    const response = await fetchWithTimeout(`https://api.github.com/repos/${repoRef.owner}/${repoRef.repo}`, {
      headers: { Accept: "application/vnd.github+json" },
    });

    if (!response.ok) {
      return { ok: false };
    }

    const data = (await response.json()) as { default_branch?: string };
    return { ok: true, defaultBranch: data.default_branch };
  } catch {
    return { ok: false };
  }
}

async function fetchTargetFiles(repoRef: RepoRef, branches: string[]): Promise<FetchedFile[]> {
  return Promise.all(TARGET_FILES.map((path) => fetchRawFile(repoRef, path, branches)));
}

async function fetchRawFile(repoRef: RepoRef, path: string, branches: string[]): Promise<FetchedFile> {
  for (const branch of branches) {
    try {
      const rawUrl = `https://raw.githubusercontent.com/${repoRef.owner}/${repoRef.repo}/${branch}/${path}`;
      const response = await fetchWithTimeout(rawUrl);

      if (response.ok) {
        const text = await response.text();
        return {
          path,
          detected: true,
          status: response.status,
          bytes: text.length,
          branch,
          text,
          snippet: makeSnippet(redactLine(text)),
        };
      }

      if (response.status !== 404) {
        return { path, detected: false, status: response.status, branch };
      }
    } catch {
      continue;
    }
  }

  return { path, detected: false, status: 404 };
}

async function detectApiRouteIndicators(
  repoRef: RepoRef,
  branches: string[],
  fetchedFiles: FetchedFile[],
): Promise<ScanChecks["repo"]["apiRouteIndicators"]> {
  const indicators = {
    appApi: fetchedFiles.some((file) => file.detected && file.path.startsWith("app/api/")),
    srcAppApi: fetchedFiles.some((file) => file.detected && file.path.startsWith("src/app/api/")),
    pagesApi: fetchedFiles.some((file) => file.detected && file.path.startsWith("pages/api/")),
  };

  const checks = [
    { key: "appApi" as const, path: "app/api" },
    { key: "srcAppApi" as const, path: "src/app/api" },
    { key: "pagesApi" as const, path: "pages/api" },
  ];

  await Promise.all(
    checks.map(async (check) => {
      if (indicators[check.key]) {
        return;
      }

      for (const branch of branches) {
        try {
          const url = `https://api.github.com/repos/${repoRef.owner}/${repoRef.repo}/contents/${check.path}?ref=${branch}`;
          const response = await fetchWithTimeout(url, {
            headers: { Accept: "application/vnd.github+json" },
          });

          if (response.ok) {
            indicators[check.key] = true;
            return;
          }
        } catch {
          continue;
        }
      }
    }),
  );

  return indicators;
}

async function fetchLiveUrl(liveUrl: string) {
  const emptyHeaders = Object.fromEntries(SECURITY_HEADERS.map((header) => [header, false])) as Record<
    (typeof SECURITY_HEADERS)[number],
    boolean
  >;

  try {
    let response = await fetchWithTimeout(liveUrl, { method: "HEAD", redirect: "follow" }, 7000);

    if (response.status === 405 || response.status === 403 || response.status >= 500) {
      response = await fetchWithTimeout(liveUrl, { method: "GET", redirect: "follow" }, 7000);
    }

    return {
      ok: response.status === 200,
      status: response.status,
      finalUrl: response.url,
      securityHeaders: Object.fromEntries(
        SECURITY_HEADERS.map((header) => [header, Boolean(response.headers.get(header))]),
      ) as Record<(typeof SECURITY_HEADERS)[number], boolean>,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Live URL could not be reached.",
      securityHeaders: emptyHeaders,
    };
  }
}

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const headers = new Headers(init?.headers);
  headers.set("user-agent", "LaunchGuard-AI-local-demo");

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
      headers,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function parseDependencySignals(packageJsonText: string): Record<string, boolean> {
  const signals = Object.fromEntries(DEPENDENCIES_TO_DETECT.map((dependency) => [dependency, false]));

  if (!packageJsonText) {
    return signals;
  }

  try {
    const packageJson = JSON.parse(packageJsonText) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const dependencyMap = {
      ...(packageJson.dependencies ?? {}),
      ...(packageJson.devDependencies ?? {}),
    };

    for (const dependency of DEPENDENCIES_TO_DETECT) {
      signals[dependency] = Boolean(dependencyMap[dependency]);
    }
  } catch {
    for (const dependency of DEPENDENCIES_TO_DETECT) {
      signals[dependency] = hasKeyword(packageJsonText, dependency);
    }
  }

  return signals;
}

function analyzeReadme(readme: string): ReadmeQuality {
  return {
    hasSetupInstructions:
      /\b(install|npm install|pnpm install|yarn|bun install|getting started|run locally|local development|npm run dev|environment variables)\b/i.test(
        readme,
      ),
    hasEnvInstructions: /\b(\.env|environment variable|api key|secret|DATABASE_URL|NEXT_PUBLIC_)\b/i.test(readme),
    hasDemoLink: /\b(demo|live app|deployed|vercel\.app|netlify\.app|render\.com|https?:\/\/)\b/i.test(readme),
    hasProjectPurpose: /\b(what it does|overview|purpose|problem|helps|built for|features?)\b/i.test(readme),
    hasScreenshotsOrVideo: /\b(screenshot|screen shot|video|gif|loom|demo recording|preview)\b/i.test(readme),
    hasLimitations: /\b(limitation|known issue|future work|roadmap|todo|not supported)\b/i.test(readme),
  };
}

function analyzeDescription(description: string): DescriptionQuality {
  const words = description.split(/\s+/).filter(Boolean);
  const hasTargetUser = /\b(for|helps|students?|founders?|indie hackers?|teams?|developers?|builders?|users?|customers?|creators?)\b/i.test(
    description,
  );
  const hasProblem = /\b(problem|pain|struggle|before|risk|blocker|confusing|slow|hard|miss|avoid|catch|audit|need)\b/i.test(
    description,
  );
  const hasValueProposition = /\b(so|so that|to help|helps|enables|improves|reduces|saves|find|catch|generate|ship|launch)\b/i.test(
    description,
  );
  const featureOnly =
    words.length > 0 &&
    /\b(dashboard|chatbot|platform|tool|app|features?|uses ai|scanner)\b/i.test(description) &&
    !(hasTargetUser && hasProblem);

  return {
    wordCount: words.length,
    tooShort: words.length < 10 || description.length < 55,
    hasTargetUser,
    hasProblem,
    hasValueProposition,
    featureOnly,
  };
}

function findPossibleSecretPatterns(files: FetchedFile[]): SecretPattern[] {
  const patterns = [
    { label: "API_KEY=", regex: /\b[A-Z0-9_]*API_KEY\s*=/i },
    { label: "SECRET=", regex: /\b[A-Z0-9_]*SECRET\s*=/i },
    { label: "TOKEN=", regex: /\b[A-Z0-9_]*TOKEN\s*=/i },
    { label: "PRIVATE_KEY", regex: /PRIVATE_KEY/i },
    { label: "sk-", regex: /\bsk-[A-Za-z0-9_-]{10,}/ },
    { label: "password=", regex: /\bpassword\s*=/i },
    { label: "DATABASE_URL=", regex: /\bDATABASE_URL\s*=/i },
  ];
  const hits: SecretPattern[] = [];

  for (const file of files) {
    if (!file.text || isLockfile(file.path)) {
      continue;
    }

    const lines = file.text.split(/\r?\n/);

    for (const line of lines) {
      for (const pattern of patterns) {
        if (pattern.regex.test(line)) {
          hits.push({
            file: file.path,
            pattern: pattern.label,
            linePreview: redactLine(line.trim()).slice(0, 140),
          });
        }
      }

      if (hits.length >= 6) {
        return hits;
      }
    }
  }

  return hits;
}

function calculateScores(checks: ScanChecks) {
  const missingHeaderCount = Object.values(checks.liveUrl.securityHeaders).filter((present) => !present).length;
  const readmeQualityCount = Object.values(checks.signals.readmeQuality).filter(Boolean).length;
  const description = checks.signals.descriptionQuality;
  const packageOrStructure = checks.signals.packageJsonExists || checks.repo.detectedFiles.length >= 3;

  const productionScore = clampScore(
    100 -
      (checks.signals.readmeExists ? 0 : 13) -
      (checks.signals.readmeHasSetupInstructions ? 0 : 10) -
      (checks.signals.packageJsonExists ? 0 : 13) -
      (checks.signals.lockfileExists ? 0 : 9) -
      (checks.signals.envExampleExists ? 0 : 8) -
      (checks.liveUrl.ok ? 0 : 22) -
      (checks.signals.deploymentConfigDetected ? 0 : 5) -
      (checks.signals.typescriptDetected ? 0 : 4) -
      (packageOrStructure ? 0 : 8),
  );

  const securityScore = clampScore(
    100 -
      missingHeaderCount * 5 -
      (checks.signals.possibleSecretPatterns.length === 0
        ? 0
        : Math.min(32, checks.signals.possibleSecretPatterns.length * 16)) -
      (checks.signals.apiRoutesDetected && !checks.signals.validationLibraryDetected ? 15 : 0) -
      (checks.signals.authOrMiddlewareDetected ? 0 : checks.signals.apiRoutesDetected ? 8 : 4) -
      (checks.signals.envExampleExists ? 0 : 5),
  );

  const demoClarityScore = clampScore(
    100 -
      (checks.liveUrl.ok ? 0 : 30) -
      (checks.signals.readmeQuality.hasProjectPurpose ? 0 : 8) -
      (checks.signals.readmeHasSetupInstructions ? 0 : 8) -
      (checks.signals.productDescriptionClear ? 0 : 20) -
      (readmeQualityCount >= 3 ? 0 : 6),
  );

  const businessFeasibilityScore = clampScore(
    100 -
      (description.hasTargetUser ? 0 : 18) -
      (description.hasProblem ? 0 : 18) -
      (description.hasValueProposition ? 0 : 16) -
      (description.tooShort ? 14 : 0) -
      (description.featureOnly ? 8 : 0) -
      (checks.liveUrl.ok ? 0 : 8) -
      (checks.signals.readmeQuality.hasProjectPurpose ? 0 : 5) -
      (checks.signals.readmeQuality.hasDemoLink || checks.liveUrl.ok ? 0 : 5),
  );

  const overallScore = Math.round(
    productionScore * 0.3 + securityScore * 0.3 + demoClarityScore * 0.2 + businessFeasibilityScore * 0.2,
  );

  return {
    overallScore,
    productionScore,
    securityScore,
    demoClarityScore,
    businessFeasibilityScore,
  };
}

function buildFindings(checks: ScanChecks, description: string): TopFinding[] {
  const findings: TopFinding[] = [];
  const repoName = `${checks.repo.owner}/${checks.repo.name}`;
  const missingHeaders = Object.entries(checks.liveUrl.securityHeaders)
    .filter(([, present]) => !present)
    .map(([header]) => header);

  if (!checks.repo.repoApiReachable) {
    findings.push({
      severity: "high",
      category: "infrastructure",
      title: "GitHub repository metadata was not reachable",
      evidence: `${repoName} could not be confirmed through the public GitHub repository API.`,
      recommendation:
        "Confirm the repository is public and the URL is correct. LaunchGuard can still use targeted raw-file checks when available.",
    });
  }

  if (!checks.liveUrl.ok) {
    findings.push({
      severity: "high",
      category: "deployment",
      title: "Live demo was not confirmed reachable",
      evidence: checks.liveUrl.status
        ? `${checks.liveUrl.url} returned HTTP ${checks.liveUrl.status}.`
        : checks.liveUrl.error ?? "The live URL request failed.",
      recommendation:
        "Make the deployed app public and confirm the primary URL returns HTTP 200 before sharing it with users, investors, or demo audiences.",
    });
  }

  if (checks.signals.possibleSecretPatterns.length > 0) {
    const firstHit = checks.signals.possibleSecretPatterns[0];
    findings.push({
      severity: "critical",
      category: "security",
      title: "Possible secret-like pattern detected in targeted files",
      evidence: `${firstHit.pattern} matched in ${firstHit.file}: ${firstHit.linePreview}`,
      recommendation:
        "Manually verify this is not a real credential. If it is real, rotate the secret, remove it from git history, and commit only placeholder values.",
    });
  }

  if (missingHeaders.length > 0) {
    findings.push({
      severity: missingHeaders.length >= 4 ? "medium" : "low",
      category: "security",
      title: "Security headers were not fully detected",
      evidence: `Not detected on the live response: ${missingHeaders.join(", ")}.`,
      recommendation:
        "Add baseline browser protections such as CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and HSTS where appropriate.",
    });
  }

  if (!checks.signals.readmeExists) {
    findings.push({
      severity: "medium",
      category: "documentation",
      title: "README was not detected in targeted scan",
      evidence: `${repoName} did not return README.md from the checked branch paths.`,
      recommendation:
        "Add a concise README with the product purpose, local setup, environment variables, live demo link, and known limitations.",
    });
  } else {
    if (!checks.signals.readmeHasSetupInstructions) {
      findings.push({
        severity: "medium",
        category: "documentation",
        title: "README setup instructions were not detected",
        evidence:
          "README.md exists, but setup keywords such as install, run locally, environment variables, or npm run dev were not detected.",
        recommendation:
          "Add copy-pasteable local setup steps so collaborators and reviewers can run the app quickly.",
      });
    }

    if (!checks.signals.readmeQuality.hasProjectPurpose) {
      findings.push({
        severity: "low",
        category: "documentation",
        title: "README project purpose could be clearer",
        evidence: "README.md was detected, but purpose/problem/overview language was not detected.",
        recommendation:
          "Add a short overview that explains who the app is for, what problem it solves, and what a successful first use looks like.",
      });
    }
  }

  if (!checks.signals.envExampleExists) {
    findings.push({
      severity: "medium",
      category: "infrastructure",
      title: "Environment variable example file was not detected",
      evidence: ".env.example was not found in the targeted file set.",
      recommendation:
        "Add an .env.example that documents required variables with placeholder values and no real credentials.",
    });
  }

  if (!checks.signals.lockfileExists) {
    findings.push({
      severity: "medium",
      category: "infrastructure",
      title: "Package lockfile was not detected",
      evidence: "package-lock.json, pnpm-lock.yaml, and yarn.lock were not detected.",
      recommendation:
        "Commit exactly one package-manager lockfile to make installs reproducible across teammates and deployment systems.",
    });
  }

  if (checks.signals.apiRoutesDetected && !checks.signals.validationLibraryDetected) {
    findings.push({
      severity: "medium",
      category: "security",
      title: "API routes detected without a validation library signal",
      evidence:
        "An API route indicator was detected, but zod, yup, valibot, or joi was not detected in dependencies or targeted files.",
      recommendation:
        "Validate request bodies and query parameters at API boundaries before trusting user input.",
    });
  }

  if (
    checks.signals.databaseDetected &&
    !checks.repo.files["prisma/schema.prisma"]?.detected &&
    !checks.repo.files["drizzle.config.ts"]?.detected &&
    !checks.repo.files["supabase/config.toml"]?.detected
  ) {
    findings.push({
      severity: "low",
      category: "database",
      title: "Database tooling detected, but schema/config was not detected",
      evidence: `Database signals found: ${checks.signals.databaseSignals.join(", ") || "dependency references"}.`,
      recommendation:
        "If the app depends on persistent data, document the schema or database setup path so reviewers can understand how state is managed.",
    });
  }

  if (!checks.signals.authOrMiddlewareDetected) {
    findings.push({
      severity: "low",
      category: "security",
      title: "Auth or middleware was not detected in targeted scan",
      evidence:
        "middleware/proxy files and common auth package references were not detected in the targeted file set.",
      recommendation:
        "If the app has protected data or write actions, add an explicit access-control story. If it is intentionally public, document that assumption.",
    });
  }

  if (!checks.signals.productDescriptionClear) {
    findings.push({
      severity: "medium",
      category: "business",
      title: "Product positioning needs sharper launch language",
      evidence: `Submitted description: "${description || "No description provided."}"`,
      recommendation:
        "Rewrite the description to name the target user, the painful launch problem, and the outcome the product creates.",
    });
  }

  return findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]).slice(0, 8);
}

function buildSummary(
  checks: ScanChecks,
  scores: Pick<ScanReport, "overallScore" | "productionScore" | "securityScore" | "demoClarityScore" | "businessFeasibilityScore">,
  findings: TopFinding[],
  reportAudience: ReportAudience,
): string {
  const repoName = `${checks.repo.owner}/${checks.repo.name}`;
  const audienceIntro = getAudienceIntro(reportAudience);
  const liveStatus = checks.liveUrl.ok
    ? `The live demo responded with HTTP ${checks.liveUrl.status}.`
    : checks.liveUrl.status
      ? `The live demo returned HTTP ${checks.liveUrl.status}.`
      : "The live demo could not be reached during this scan.";
  const scoreEntries = [
    ["production readiness", scores.productionScore],
    ["security", scores.securityScore],
    ["demo clarity", scores.demoClarityScore],
    ["market readiness", scores.businessFeasibilityScore],
  ] as const;
  const strongestArea = scoreEntries.reduce((best, current) => (current[1] > best[1] ? current : best));
  const biggestRisk = findings[0]?.title ?? "No major launch blocker was generated from the targeted checks";
  const nextFix = findings[0]?.recommendation ?? "Keep the README, live demo, and setup instructions current.";

  return `${audienceIntro} ${repoName} scored ${scores.overallScore}/100 for pre-launch diligence. ${liveStatus} Strongest area: ${strongestArea[0]} (${strongestArea[1]}/100). Biggest risk from the targeted scan: ${biggestRisk}. Recommended next fix: ${nextFix}`;
}

function buildNextSteps(checks: ScanChecks, findings: TopFinding[], reportAudience: ReportAudience): string[] {
  const steps = findings.slice(0, 5).map((finding) => finding.recommendation);

  if (!checks.signals.readmeHasSetupInstructions) {
    steps.push("Add a README section with exact install, environment, and run commands.");
  }

  if (!checks.signals.envExampleExists) {
    steps.push("Add an .env.example with placeholder values for every required variable.");
  }

  if (checks.liveUrl.ok) {
    steps.push("Run through the live demo in a fresh browser session and remove any confusing empty states.");
  } else {
    steps.push("Make the live deployment public and verify the primary URL returns HTTP 200.");
  }

  if (reportAudience === "investor-mentor") {
    steps.push("Prepare a short explanation of the biggest technical risk and how you will reduce it before launch.");
  }

  if (reportAudience === "technical-reviewer") {
    steps.push("Document which risks were not covered by this targeted scan so reviewers know the audit boundary.");
  }

  if (reportAudience === "accelerator") {
    steps.push("Turn the highest-priority findings into a cohort-ready checklist for the next review session.");
  }

  return unique(steps).slice(0, 6);
}

function buildFounderReadinessMemo(
  checks: ScanChecks,
  findings: TopFinding[],
  description: string,
  reportAudience: ReportAudience,
): ScanReport["founderReadinessMemo"] {
  const quality = checks.signals.descriptionQuality;
  const repoName = `${checks.repo.owner}/${checks.repo.name}`;
  const targetUser = quality.hasTargetUser
    ? inferTargetUser(description)
    : "Target user is not clearly stated in the submitted description.";
  const corePain = quality.hasProblem
    ? inferCorePain(description)
    : "Core user pain is not clearly stated yet; the pitch should explain the launch or workflow problem.";
  const credibilitySignals = buildCredibilitySignals(checks);
  const mainTechnicalFinding =
    findings.find((finding) => finding.category !== "business") ??
    findings[0];
  const mainMarketFinding =
    findings.find((finding) => finding.category === "business") ??
    (!checks.signals.productDescriptionClear
      ? {
          title: "Market story is under-specified",
          recommendation: "Clarify the target user, pain, and value proposition.",
        }
      : undefined);

  return {
    productSummary: description.trim()
      ? `Based on the submitted description, ${description.trim()}`
      : `The product summary for ${repoName} is not clear because no description was provided.`,
    likelyTargetUser: targetUser,
    coreUserPain: corePain,
    credibilitySignals,
    mainTechnicalRisk: mainTechnicalFinding
      ? `${mainTechnicalFinding.title}: ${mainTechnicalFinding.recommendation}`
      : "No major technical risk was generated from the targeted scan, but this is not a full code audit.",
    mainMarketRisk: mainMarketFinding
      ? `${mainMarketFinding.title}: ${mainMarketFinding.recommendation}`
      : "Market readiness looks directionally clear from the submitted description; validate that users care enough to try it now.",
    mentorInvestorQuestions: buildMentorInvestorQuestions(checks, reportAudience),
  };
}

function buildLaunchPlan(checks: ScanChecks, findings: TopFinding[]): ScanReport["launchPlan"] {
  const blockerRecommendations = findings.slice(0, 4).map((finding) => finding.recommendation);
  const beforeSharingWithUsers = unique([
    checks.liveUrl.ok
      ? "Run the primary user workflow on the live URL in a fresh browser session."
      : "Make the live demo reachable before sending it to users.",
    checks.signals.productDescriptionClear
      ? "Put the clearest user pain and outcome on the first screen of the product or README."
      : "Clarify the target user and pain point in the README and landing page.",
    checks.signals.readmeQuality.hasDemoLink
      ? ""
      : "Add a live demo link or screenshot so a first-time visitor understands the product quickly.",
    blockerRecommendations[0] ?? "",
  ]);
  const beforeShowingMentorsInvestors = unique([
    "Prepare a concise answer for the main technical risk and main market risk in the memo.",
    checks.signals.readmeExists
      ? "Make sure the README explains the problem, setup, demo path, and known limitations."
      : "Add a README that explains the problem, setup, demo path, and known limitations.",
    checks.signals.productDescriptionClear
      ? "Explain why this user segment cares now and what they do today instead."
      : "Rewrite the positioning so mentors can identify the user, pain, and value proposition in one sentence.",
    blockerRecommendations[1] ?? "",
  ]);
  const beforeProductionLaunch = unique([
    checks.signals.envExampleExists
      ? "Verify committed env examples contain placeholders only."
      : "Add an .env.example so another developer can run the project safely.",
    checks.signals.apiRoutesDetected && !checks.signals.validationLibraryDetected
      ? "Add input validation to API routes before accepting user-submitted data."
      : "Document how user input is validated or why the app does not accept sensitive input.",
    Object.values(checks.liveUrl.securityHeaders).every(Boolean)
      ? "Re-check security headers after deployment changes."
      : "Add missing security headers before production launch.",
    checks.signals.possibleSecretPatterns.length > 0
      ? "Manually verify possible secret-like patterns and rotate any real credentials."
      : "",
    blockerRecommendations[2] ?? "",
  ]);

  return {
    beforeSharingWithUsers: beforeSharingWithUsers.slice(0, 4),
    beforeShowingMentorsInvestors: beforeShowingMentorsInvestors.slice(0, 4),
    beforeProductionLaunch: beforeProductionLaunch.slice(0, 4),
  };
}

function buildLaunchSimulation(
  checks: ScanChecks,
  findings: TopFinding[],
  memo: ScanReport["founderReadinessMemo"],
  plan: ScanReport["launchPlan"],
): ScanReport["launchSimulation"] {
  const technicalFinding =
    findings.find((finding) => ["security", "infrastructure", "deployment", "database"].includes(finding.category)) ??
    findings[0];
  const marketFinding = findings.find((finding) => finding.category === "business");
  const docsFinding = findings.find((finding) => finding.category === "documentation");
  const topFinding = findings[0];
  const technicalConcern = technicalFinding
    ? `${technicalFinding.title}. ${technicalFinding.evidence}`
    : "No major technical blocker was generated, but this was a targeted scan rather than a full code audit.";
  const marketConcern = marketFinding
    ? `${marketFinding.title}. ${marketFinding.evidence}`
    : checks.signals.productDescriptionClear
      ? "The description is directionally clear, but the founder still needs evidence that the target user cares now."
      : "The submitted description does not fully clarify target user, pain, and value proposition.";
  const setupConcern = docsFinding
    ? `${docsFinding.title}. ${docsFinding.evidence}`
    : checks.signals.envExampleExists
      ? "Setup documentation has some positive signals, but handoff should still be tested with a fresh developer."
      : "The targeted scan did not detect an .env.example, which can make safe handoff harder.";

  return [
    {
      audience: "Founder self-check",
      likelyReaction:
        topFinding && topFinding.severity !== "low"
          ? `The prototype is promising, but the next launch blocker is ${topFinding.title.toLowerCase()}.`
          : "The prototype is close enough to demo, but the founder should still tighten handoff and launch clarity.",
      concern: setupConcern,
      bestResponse:
        plan.beforeSharingWithUsers[0] ??
        "Turn the top finding into a small fix before sharing the repo or live demo.",
    },
    {
      audience: "Investor / mentor reaction",
      likelyReaction:
        checks.signals.productDescriptionClear
          ? "The product direction is understandable, but the proof of urgency and credibility needs to be explicit."
          : "The product may be useful, but the target customer and pain need sharper proof.",
      concern: marketConcern,
      bestResponse:
        plan.beforeShowingMentorsInvestors[0] ??
        "Lead with the specific user pain, current workaround, and the most credible demo evidence.",
    },
    {
      audience: "Technical reviewer reaction",
      likelyReaction:
        checks.liveUrl.ok
          ? "The app has a working deployment, but production readiness depends on validation, setup, and security hardening."
          : "The repo can be inspected, but the public deployment needs to be reachable before a serious technical review.",
      concern: technicalConcern,
      bestResponse:
        plan.beforeProductionLaunch[0] ??
        "Fix the top technical finding and document what this targeted scan did not cover.",
    },
    {
      audience: "Accelerator/program reviewer reaction",
      likelyReaction:
        "This could be useful in a review workflow if the founder can turn the diligence output into repeatable launch actions.",
      concern: `Based on the targeted scan, the main diligence risk is: ${memo.mainTechnicalRisk}`,
      bestResponse:
        "Use the Founder Brief and Launch Plan as the repeatable review artifact, then frame the roadmap around saved reports, cohort dashboards, and mentor workflows.",
    },
  ];
}

function inferTargetUser(description: string): string {
  const directFor = description.match(/\bfor\s+([^.,;]+)/i)?.[1]?.trim();
  const directHelps = description.match(/\bhelps\s+([^.,;]+?)\s+(?:who|to|catch|find|build|launch|with)\b/i)?.[1]?.trim();
  const candidate = directFor || directHelps;

  return candidate
    ? `Likely target user: ${candidate}.`
    : "The description suggests a target user, but it should name the user segment more directly.";
}

function inferCorePain(description: string): string {
  const beforeClause = description.match(/\bbefore\s+([^.,;]+)/i)?.[1]?.trim();
  const riskClause = description.match(/\b(?:risk|blocker|pain|problem|catch|find)\w*\s+([^.,;]+)/i)?.[1]?.trim();
  const candidate = beforeClause || riskClause;

  return candidate
    ? `Likely core pain: ${candidate}.`
    : "The description gestures at a problem, but the pain should be stated in plainer user language.";
}

function buildCredibilitySignals(checks: ScanChecks): string {
  const signals = [
    checks.liveUrl.ok ? `live demo responded with HTTP ${checks.liveUrl.status}` : "",
    checks.signals.packageJsonExists ? "package.json detected" : "",
    checks.signals.lockfileExists ? "lockfile detected" : "",
    checks.signals.typescriptDetected ? "TypeScript signal detected" : "",
    checks.signals.validationLibraryDetected
      ? `validation signal detected (${checks.signals.validationLibraries.join(", ")})`
      : "",
    checks.signals.databaseDetected ? "database tooling signal detected" : "",
    checks.signals.authOrMiddlewareDetected ? "auth or middleware signal detected" : "",
  ].filter(Boolean);

  return signals.length > 0
    ? signals.join("; ")
    : "Few credibility signals were detected in the targeted scan. Add clearer docs, demo evidence, and setup details.";
}

function buildMentorInvestorQuestions(checks: ScanChecks, reportAudience: ReportAudience): string[] {
  const questions = [
    "Who feels this problem most urgently, and what are they doing today instead?",
    "What is the first workflow a user should complete in the live demo?",
    "What evidence shows this is ready to share beyond a local prototype?",
  ];

  if (reportAudience === "technical-reviewer") {
    questions.push("Which code paths handle user input, auth, data writes, or third-party integrations?");
  }

  if (reportAudience === "accelerator") {
    questions.push("Which findings should be fixed before the next cohort demo or mentor review?");
  }

  if (reportAudience === "investor-mentor") {
    questions.push("What would make this credible as a repeatable pre-launch workflow rather than a one-off tool?");
  }

  if (!checks.signals.productDescriptionClear) {
    questions.push("Can the founder explain the user, pain, and outcome in one sentence?");
  }

  if (!checks.liveUrl.ok) {
    questions.push("Why should a reviewer trust the launch if the public demo is not reachable?");
  }

  if (checks.signals.possibleSecretPatterns.length > 0) {
    questions.push("Have all possible secret-like patterns been manually verified and rotated if needed?");
  }

  if (checks.signals.apiRoutesDetected && !checks.signals.validationLibraryDetected) {
    questions.push("How is user input validated before it reaches API logic or the database?");
  }

  return questions.slice(0, 5);
}

function buildPositioningFeedback(checks: ScanChecks, description: string): string {
  const quality = checks.signals.descriptionQuality;

  if (!description.trim()) {
    return "No product description was provided. Add one sentence that names the target user, the painful launch problem, and the concrete outcome.";
  }

  const gaps = [
    quality.hasTargetUser ? "" : "target user",
    quality.hasProblem ? "" : "core pain",
    quality.hasValueProposition ? "" : "value proposition",
  ].filter(Boolean);

  if (gaps.length === 0 && !quality.tooShort) {
    return `Market readiness is directionally strong: "${description.trim()}". To make it stronger, add why this problem matters now, what the user does today instead, and what evidence makes the current product credible.`;
  }

  return `Market readiness needs sharper language around ${gaps.join(", ") || "specificity"}. A stronger launch sentence would name who feels the pain, when they feel it, why they care, and why this product is credible enough to try.`;
}

function buildDemoReadinessAdvice(checks: ScanChecks, reportAudience: ReportAudience): string {
  if (!checks.liveUrl.ok) {
    return "Fix live deployment reachability before recording. In the demo, be honest that repo checks can still run, but the public product experience must load reliably before launch.";
  }

  const headerCount = Object.values(checks.liveUrl.securityHeaders).filter(Boolean).length;
  const headerAdvice =
    headerCount === SECURITY_HEADERS.length
      ? `All ${SECURITY_HEADERS.length} checked security headers were detected on the live response.`
      : `Mention that header checks are best-effort and add the missing headers where appropriate (${headerCount}/${SECURITY_HEADERS.length} detected).`;

  const audienceAdvice =
    reportAudience === "technical-reviewer"
      ? "For a technical review, call out what was checked, what was not checked, and which risks need manual follow-up."
      : reportAudience === "investor-mentor"
        ? "For mentors or investors, lead with the user pain, then show how the report turns vague launch risk into concrete next actions."
        : reportAudience === "accelerator"
          ? "For accelerator reviews, use the launch plan as a shared checklist across projects."
          : "For a founder demo, start on the first screen a real user would see and complete one primary workflow.";

  return `${audienceAdvice} Then show the LaunchGuard report as the pre-launch checklist. Do not over-explain internals; focus on the blocker, the evidence, and the next fix. ${headerAdvice}`;
}

function getAudienceIntro(reportAudience: ReportAudience): string {
  if (reportAudience === "investor-mentor") {
    return "For a mentor or investor review,";
  }

  if (reportAudience === "technical-reviewer") {
    return "For a technical review,";
  }

  if (reportAudience === "accelerator") {
    return "For an accelerator readiness review,";
  }

  return "For a founder preparing to launch,";
}

async function maybeSynthesizeWithGemini(
  report: ScanReport,
  description: string,
  reportAudience: ReportAudience,
): Promise<ScanReport> {
  const apiKey = process.env.GEMINI_API_KEY;
  const hasApiKey = Boolean(apiKey);
  console.info("[LaunchGuard] GEMINI_API_KEY present:", hasApiKey);
  console.info("[LaunchGuard] Gemini model used:", GEMINI_MODEL);

  if (!apiKey) {
    console.info("[LaunchGuard] Gemini synthesis attempted:", false);
    console.info("[LaunchGuard] Gemini HTTP status:", "not attempted");
    console.info("[LaunchGuard] Gemini response text length:", 0);
    console.info("[LaunchGuard] Gemini JSON parse success:", false);
    return report;
  }

  console.info("[LaunchGuard] Gemini synthesis attempted:", true);
  let httpStatusLogged = false;
  let responseTextLengthLogged = false;
  let jsonParseLogged = false;

  try {
    const response = await fetchWithTimeout(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [
            {
              text:
                "You synthesize LaunchGuard AI deterministic scan evidence into audience-specific diligence language. Do not invent facts. Do not claim files were inspected if they were not. Use 'not detected in targeted scan' when uncertain. Scores and top findings are deterministic source-of-truth and must not be changed. Return JSON only.",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: JSON.stringify({
                  task:
                    "Return a synthesisPatch JSON object with exactly these keys when useful: summary, positioningFeedback, demoReadinessAdvice, nextSteps, founderReadinessMemo, launchPlan, launchSimulation. Do not return scores. Do not return topFindings. Preserve the provided evidence and tailor wording to reportAudience.",
                  reportAudience,
                  reportAudienceLabel: getAudienceIntro(reportAudience),
                  submittedDescription: description,
                  deterministicEvidence: buildGeminiEvidencePackage(report),
                }),
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    }, GEMINI_TIMEOUT_MS);
    console.info("[LaunchGuard] Gemini HTTP status:", response.status);
    httpStatusLogged = true;

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.info("[LaunchGuard] Gemini response text length:", errorText.length);
      responseTextLengthLogged = true;
      throw new Error(`Gemini returned HTTP ${response.status}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    console.info("[LaunchGuard] Gemini response text length:", text.length);
    responseTextLengthLogged = true;
    const parsed = extractJsonObject(text);
    const patch = normalizeSynthesisPatch(parsed);
    console.info("[LaunchGuard] Gemini JSON parse success:", Boolean(patch));
    jsonParseLogged = true;

    if (!patch) {
      throw new Error("Gemini returned invalid JSON");
    }

    return {
      ...report,
      analysisMode: "ai-assisted",
      analysisNote:
        "Gemini synthesized deterministic scan evidence into the memo, launch plan, simulation, and audience-specific guidance.",
      summary: typeof patch.summary === "string" ? patch.summary : report.summary,
      nextSteps: sanitizeStringArray(patch.nextSteps, report.nextSteps, 6),
      founderReadinessMemo: sanitizeFounderReadinessMemo(
        patch.founderReadinessMemo,
        report.founderReadinessMemo,
      ),
      launchPlan: sanitizeLaunchPlan(patch.launchPlan, report.launchPlan),
      launchSimulation: sanitizeLaunchSimulation(patch.launchSimulation, report.launchSimulation),
      positioningFeedback:
        typeof patch.positioningFeedback === "string" ? patch.positioningFeedback : report.positioningFeedback,
      demoReadinessAdvice:
        typeof patch.demoReadinessAdvice === "string" ? patch.demoReadinessAdvice : report.demoReadinessAdvice,
    };
  } catch (error) {
    const errorInfo = getSafeErrorInfo(error);
    console.info("[LaunchGuard] Gemini error name:", errorInfo.name);
    console.info("[LaunchGuard] Gemini error message:", errorInfo.message);
    console.info("[LaunchGuard] Gemini error cause code:", errorInfo.causeCode);
    console.info("[LaunchGuard] Gemini timeout/AbortError:", errorInfo.isAbortOrTimeout);

    if (!httpStatusLogged) {
      console.info("[LaunchGuard] Gemini HTTP status:", "request failed");
    }

    if (!responseTextLengthLogged) {
      console.info("[LaunchGuard] Gemini response text length:", 0);
    }

    if (!jsonParseLogged) {
      console.info("[LaunchGuard] Gemini JSON parse success:", false);
    }

    return {
      ...report,
      analysisMode: "fallback",
      analysisNote: "Gemini synthesis was unavailable, so LaunchGuard returned the rule-based report.",
    };
  }
}

function normalizeSynthesisPatch(candidate: unknown): Partial<SynthesisPatch> | null {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const record = candidate as Record<string, unknown>;
  const maybeWrapped = record.synthesisPatch;

  if (maybeWrapped && typeof maybeWrapped === "object") {
    return maybeWrapped as Partial<SynthesisPatch>;
  }

  return record as Partial<SynthesisPatch>;
}

function buildGeminiEvidencePackage(report: ScanReport) {
  return {
    scores: {
      overallScore: report.overallScore,
      productionScore: report.productionScore,
      securityScore: report.securityScore,
      demoClarityScore: report.demoClarityScore,
      businessFeasibilityScore: report.businessFeasibilityScore,
    },
    topFindings: report.topFindings,
    checksSummary: {
      repo: {
        owner: report.checks.repo.owner,
        name: report.checks.repo.name,
        detectedFiles: report.checks.repo.detectedFiles,
        missingFiles: report.checks.repo.missingFiles,
        apiRouteIndicators: report.checks.repo.apiRouteIndicators,
        dependencies: report.checks.repo.dependencies,
      },
      liveUrl: {
        ok: report.checks.liveUrl.ok,
        status: report.checks.liveUrl.status,
        securityHeaders: report.checks.liveUrl.securityHeaders,
      },
      signals: {
        readmeExists: report.checks.signals.readmeExists,
        readmeHasSetupInstructions: report.checks.signals.readmeHasSetupInstructions,
        packageJsonExists: report.checks.signals.packageJsonExists,
        envExampleExists: report.checks.signals.envExampleExists,
        lockfileExists: report.checks.signals.lockfileExists,
        authOrMiddlewareDetected: report.checks.signals.authOrMiddlewareDetected,
        apiRoutesDetected: report.checks.signals.apiRoutesDetected,
        validationLibraryDetected: report.checks.signals.validationLibraryDetected,
        validationLibraries: report.checks.signals.validationLibraries,
        databaseDetected: report.checks.signals.databaseDetected,
        databaseSignals: report.checks.signals.databaseSignals,
        possibleSecretPatternCount: report.checks.signals.possibleSecretPatterns.length,
        productDescriptionClear: report.checks.signals.productDescriptionClear,
        deploymentConfigDetected: report.checks.signals.deploymentConfigDetected,
        typescriptDetected: report.checks.signals.typescriptDetected,
        readmeQuality: report.checks.signals.readmeQuality,
        descriptionQuality: report.checks.signals.descriptionQuality,
      },
    },
    currentReportText: {
      summary: report.summary,
      nextSteps: report.nextSteps,
      founderReadinessMemo: report.founderReadinessMemo,
      launchPlan: report.launchPlan,
      launchSimulation: report.launchSimulation,
      positioningFeedback: report.positioningFeedback,
      demoReadinessAdvice: report.demoReadinessAdvice,
    },
  };
}

function getSafeErrorInfo(error: unknown) {
  const errorRecord = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
  const cause = errorRecord.cause;
  const causeRecord = cause && typeof cause === "object" ? (cause as Record<string, unknown>) : {};
  const name = error instanceof Error ? error.name : typeof errorRecord.name === "string" ? errorRecord.name : "UnknownError";
  const message =
    error instanceof Error
      ? error.message
      : typeof errorRecord.message === "string"
        ? errorRecord.message
        : "No error message available.";
  const causeCode =
    typeof causeRecord.code === "string" || typeof causeRecord.code === "number"
      ? String(causeRecord.code)
      : "none";
  const lowerMessage = message.toLowerCase();

  return {
    name,
    message,
    causeCode,
    isAbortOrTimeout: name === "AbortError" || lowerMessage.includes("abort") || lowerMessage.includes("timeout"),
  };
}

function extractJsonObject(text: string | undefined | null): unknown | null {
  if (!text) {
    return null;
  }

  const trimmed = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      return null;
    }

    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function sanitizeLaunchSimulation(
  candidate: unknown,
  fallback: ScanReport["launchSimulation"],
): ScanReport["launchSimulation"] {
  if (!Array.isArray(candidate)) {
    return fallback;
  }

  const allowedAudiences = new Set<string>(fallback.map((item) => item.audience));
  const values = candidate
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const value = item as Partial<ScanReport["launchSimulation"][number]>;

      if (
        !allowedAudiences.has(String(value.audience)) ||
        typeof value.likelyReaction !== "string" ||
        typeof value.concern !== "string" ||
        typeof value.bestResponse !== "string"
      ) {
        return null;
      }

      return value as ScanReport["launchSimulation"][number];
    })
    .filter((item): item is ScanReport["launchSimulation"][number] => Boolean(item));

  return values.length === fallback.length ? values : fallback;
}

function sanitizeLaunchPlan(candidate: unknown, fallback: ScanReport["launchPlan"]): ScanReport["launchPlan"] {
  if (!candidate || typeof candidate !== "object") {
    return fallback;
  }

  const value = candidate as Partial<ScanReport["launchPlan"]>;

  return {
    beforeSharingWithUsers: sanitizeStringArray(
      value.beforeSharingWithUsers,
      fallback.beforeSharingWithUsers,
      4,
    ),
    beforeShowingMentorsInvestors: sanitizeStringArray(
      value.beforeShowingMentorsInvestors,
      fallback.beforeShowingMentorsInvestors,
      4,
    ),
    beforeProductionLaunch: sanitizeStringArray(
      value.beforeProductionLaunch,
      fallback.beforeProductionLaunch,
      4,
    ),
  };
}

function sanitizeFounderReadinessMemo(
  candidate: unknown,
  fallback: ScanReport["founderReadinessMemo"],
): ScanReport["founderReadinessMemo"] {
  if (!candidate || typeof candidate !== "object") {
    return fallback;
  }

  const value = candidate as Partial<ScanReport["founderReadinessMemo"]>;

  return {
    productSummary: typeof value.productSummary === "string" ? value.productSummary : fallback.productSummary,
    likelyTargetUser: typeof value.likelyTargetUser === "string" ? value.likelyTargetUser : fallback.likelyTargetUser,
    coreUserPain: typeof value.coreUserPain === "string" ? value.coreUserPain : fallback.coreUserPain,
    credibilitySignals:
      typeof value.credibilitySignals === "string" ? value.credibilitySignals : fallback.credibilitySignals,
    mainTechnicalRisk:
      typeof value.mainTechnicalRisk === "string" ? value.mainTechnicalRisk : fallback.mainTechnicalRisk,
    mainMarketRisk: typeof value.mainMarketRisk === "string" ? value.mainMarketRisk : fallback.mainMarketRisk,
    mentorInvestorQuestions: sanitizeStringArray(
      value.mentorInvestorQuestions,
      fallback.mentorInvestorQuestions,
      5,
    ),
  };
}

function sanitizeStringArray(candidate: unknown, fallback: string[], limit: number): string[] {
  if (!Array.isArray(candidate)) {
    return fallback;
  }

  const values = candidate.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return values.length > 0 ? values.slice(0, limit) : fallback;
}

function hasKeyword(text: string, keyword: string): boolean {
  return new RegExp(`(^|[^A-Za-z0-9_@/-])${escapeRegExp(keyword)}([^A-Za-z0-9_-]|$)`, "i").test(text);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isLockfile(path: string): boolean {
  return path.endsWith("package-lock.json") || path.endsWith("pnpm-lock.yaml") || path.endsWith("yarn.lock");
}

function redactLine(line: string): string {
  return line
    .replace(/(=\s*["']?)[^"',\s]+/g, "$1[redacted]")
    .replace(/(DATABASE_URL\s*=\s*)[^\s"']+/gi, "$1[redacted]")
    .replace(/sk-[A-Za-z0-9_-]+/g, "sk-[redacted]");
}

function makeSnippet(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 500);
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items.filter(Boolean)));
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
