export interface GreenhouseAnalysis {
  method:             "greenhouse";
  detected:           boolean;
  boardUrl?:          string;
  boardSlug?:         string;
  jobId?:             string;
  region?:            "us" | "eu";
  canAnalyze:         boolean;
  autoSubmitPossible: false;
  reason:             string;
}

// Supported URL formats (all produce the same slug/jobId groups):
//   boards.greenhouse.io/{slug}/jobs/{jobId}
//   boards.greenhouse.io/{slug}/jobs/{jobId}?gh_jid=...
//   job-boards.greenhouse.io/{slug}/jobs/{jobId}
//   boards.eu.greenhouse.io/{slug}/jobs/{jobId}
const GH_EU_RE = /boards\.eu\.greenhouse\.io\/([^/?#]+)\/jobs\/([^/?#]+)/i;
const GH_US_RE = /(?:boards|job-boards)\.greenhouse\.io\/([^/?#]+)\/jobs\/([^/?#]+)/i;

export function analyzeGreenhouse(input: {
  job_apply_link: string | null;
  employer_name?: string | null;
  job_title?:     string | null;
}): GreenhouseAnalysis {
  const link  = input.job_apply_link ?? "";
  const lower = link.toLowerCase();

  if (!lower.includes("greenhouse.io")) {
    return {
      method:             "greenhouse",
      detected:           false,
      canAnalyze:         false,
      autoSubmitPossible: false,
      reason:             "Not a Greenhouse link",
    };
  }

  // EU region first — more specific pattern
  const euMatch = link.match(GH_EU_RE);
  const usMatch = euMatch ? null : link.match(GH_US_RE);
  const match   = euMatch ?? usMatch;
  const region  = euMatch ? "eu" as const : "us" as const;

  if (match) {
    const boardSlug = match[1];
    const jobId     = match[2].split("?")[0]; // strip query string from jobId if present
    const boardUrl  = region === "eu"
      ? `https://boards.eu.greenhouse.io/${boardSlug}/jobs/${jobId}`
      : `https://boards.greenhouse.io/${boardSlug}/jobs/${jobId}`;

    return {
      method:             "greenhouse",
      detected:           true,
      boardUrl,
      boardSlug,
      jobId,
      region,
      canAnalyze:         true,
      autoSubmitPossible: false,
      reason:             "Greenhouse job board detected — automatic submission not yet enabled",
    };
  }

  // greenhouse.io link present but format not parseable
  return {
    method:             "greenhouse",
    detected:           true,
    canAnalyze:         false,
    autoSubmitPossible: false,
    reason:             "Greenhouse detected — link format not recognized for analysis",
  };
}
