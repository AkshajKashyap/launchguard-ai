export type FindingSeverity = "critical" | "high" | "medium" | "low";

export type FindingCategory =
  | "security"
  | "infrastructure"
  | "database"
  | "ux"
  | "business"
  | "documentation"
  | "deployment";

export type TopFinding = {
  severity: FindingSeverity;
  category: FindingCategory;
  title: string;
  evidence: string;
  recommendation: string;
};

export type AnalysisMode = "rule-based" | "ai-assisted" | "fallback";

export type RepoFileCheck = {
  detected: boolean;
  path: string;
  status?: number;
  bytes?: number;
  branch?: string;
  snippet?: string;
};

export type SecretPattern = {
  file: string;
  pattern: string;
  linePreview: string;
};

export type ScanChecks = {
  repo: {
    owner: string;
    name: string;
    defaultBranch: string;
    repoApiReachable: boolean;
    files: Record<string, RepoFileCheck>;
    detectedFiles: string[];
    missingFiles: string[];
    apiRouteIndicators: {
      appApi: boolean;
      srcAppApi: boolean;
      pagesApi: boolean;
    };
    dependencies: Record<string, boolean>;
  };
  liveUrl: {
    url: string;
    ok: boolean;
    status?: number;
    finalUrl?: string;
    error?: string;
    securityHeaders: Record<
      | "content-security-policy"
      | "x-frame-options"
      | "x-content-type-options"
      | "referrer-policy"
      | "permissions-policy"
      | "strict-transport-security",
      boolean
    >;
  };
  signals: {
    readmeExists: boolean;
    readmeHasSetupInstructions: boolean;
    packageJsonExists: boolean;
    envExampleExists: boolean;
    lockfileExists: boolean;
    authOrMiddlewareDetected: boolean;
    apiRoutesDetected: boolean;
    validationLibraryDetected: boolean;
    validationLibraries: string[];
    databaseDetected: boolean;
    databaseSignals: string[];
    possibleSecretPatterns: SecretPattern[];
    productDescriptionClear: boolean;
    deploymentConfigDetected: boolean;
    typescriptDetected: boolean;
    readmeQuality: {
      hasSetupInstructions: boolean;
      hasEnvInstructions: boolean;
      hasDemoLink: boolean;
      hasProjectPurpose: boolean;
      hasScreenshotsOrVideo: boolean;
      hasLimitations: boolean;
    };
    descriptionQuality: {
      wordCount: number;
      tooShort: boolean;
      hasTargetUser: boolean;
      hasProblem: boolean;
      hasValueProposition: boolean;
      featureOnly: boolean;
    };
  };
};

export type ScanReport = {
  analysisMode: AnalysisMode;
  analysisNote?: string;
  overallScore: number;
  productionScore: number;
  securityScore: number;
  demoClarityScore: number;
  businessFeasibilityScore: number;
  founderReadinessMemo: {
    productSummary: string;
    likelyTargetUser: string;
    coreUserPain: string;
    credibilitySignals: string;
    mainTechnicalRisk: string;
    mainMarketRisk: string;
    mentorInvestorQuestions: string[];
  };
  summary: string;
  topFindings: TopFinding[];
  nextSteps: string[];
  positioningFeedback: string;
  demoReadinessAdvice: string;
  checks: ScanChecks;
};
