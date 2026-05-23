const endpoint = "http://localhost:3000/api/scan";

const payload = {
  repoUrl: "https://github.com/vercel/next.js",
  liveUrl: "https://nextjs.org",
  description:
    "A web app for early-stage builders that helps them catch launch blockers before sharing with users.",
  reportAudience: "founder",
};

async function main() {
  console.log(`Posting smoke scan to ${endpoint}`);
  console.log("Start the dev server first with: npm run dev");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Smoke scan failed with HTTP ${response.status}: ${body}`);
  }

  const report = await response.json();
  const hasShape =
    typeof report.overallScore === "number" &&
    Array.isArray(report.topFindings) &&
    Array.isArray(report.nextSteps) &&
    Boolean(report.founderReadinessMemo) &&
    Boolean(report.launchPlan);

  console.log(`overallScore: ${report.overallScore}`);
  console.log(`topFindings: ${report.topFindings?.length ?? 0}`);
  console.log(`nextSteps: ${report.nextSteps?.length ?? 0}`);
  console.log(`launchPlan: ${report.launchPlan ? "present" : "missing"}`);
  console.log(hasShape ? "Smoke scan shape looks good." : "Smoke scan returned an unexpected shape.");

  process.exit(hasShape ? 0 : 1);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
