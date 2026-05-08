// Server-only — do not import in client components or pages.
// Uses Node fetch + string parsing to inspect a Greenhouse application page.

import { analyzeGreenhouse } from "./greenhouse-analyzer";

export interface GreenhouseReadiness {
  detected:                    boolean;
  canAnalyze:                  boolean;
  autoSubmitPossible:          false;
  requiredFields:              string[];
  customQuestions:             string[];
  resumeRequired:              boolean | null;
  coverLetterRequired:         boolean | null;
  sponsorshipQuestionDetected: boolean;
  workAuthQuestionDetected:    boolean;
  missingUserProfileFields:    string[];  // requires profile integration — always [] for now
  reason:                      string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 6_000;

// Greenhouse standard field IDs → human labels
const FIELD_LABELS: Record<string, string> = {
  first_name:       "First Name",
  last_name:        "Last Name",
  email:            "Email",
  phone:            "Phone",
  resume:           "Resume",
  cover_letter:     "Cover Letter",
  linkedin_profile: "LinkedIn Profile",
  website:          "Website / Portfolio",
  location:         "Location",
};

const SPONSORSHIP_RE = /sponsor(?:ship)?|h[\-\s]?1[\-\s]?b|visa\s+(?:transfer|sponsor)/i;
const WORK_AUTH_RE   = /(?:legally\s+)?authorized?\s+to\s+work|work\s+authori[sz]ation|work\s+permit|right\s+to\s+work/i;

// ── Result helpers ─────────────────────────────────────────────────────────────

function notGh(reason: string): GreenhouseReadiness {
  return {
    detected: false, canAnalyze: false, autoSubmitPossible: false,
    requiredFields: [], customQuestions: [],
    resumeRequired: null, coverLetterRequired: null,
    sponsorshipQuestionDetected: false, workAuthQuestionDetected: false,
    missingUserProfileFields: [],
    reason,
  };
}

function noAnalyze(reason: string): GreenhouseReadiness {
  return {
    detected: true, canAnalyze: false, autoSubmitPossible: false,
    requiredFields: [], customQuestions: [],
    resumeRequired: null, coverLetterRequired: null,
    sponsorshipQuestionDetected: false, workAuthQuestionDetected: false,
    missingUserProfileFields: [],
    reason,
  };
}

// ── Main analyzer ─────────────────────────────────────────────────────────────

export async function analyzeGreenhouseReadiness(input: {
  job_apply_link:  string | null;
  employer_name?:  string | null;
  job_title?:      string | null;
}): Promise<GreenhouseReadiness> {

  // 1. Confirm parseable Greenhouse link
  const gh = analyzeGreenhouse(input);
  if (!gh.detected)                        return notGh("Not a Greenhouse link");
  if (!gh.canAnalyze || !gh.boardUrl)      return noAnalyze(gh.reason);

  // 2. Fetch the /apply page (the actual form, not the job listing)
  const applyUrl = `${gh.boardUrl}/apply`;
  let html: string;
  try {
    const res = await fetch(applyUrl, {
      method:  "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Vegaply/1.0; +https://vegaply.com)",
        "Accept":     "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) return noAnalyze(`Greenhouse page returned HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message.slice(0, 120) : "fetch failed";
    return noAnalyze(`Could not reach Greenhouse page: ${msg}`);
  }

  // 3. Sanity check — confirm we received a Greenhouse application form
  const looksLikeForm =
    html.includes("application_form") ||
    html.includes("greenhouse-application") ||
    (html.includes("greenhouse.io") && html.includes("<form"));

  if (!looksLikeForm) {
    return noAnalyze("Fetched page does not appear to contain a Greenhouse application form");
  }

  // 4. Required standard fields
  //    Greenhouse pattern: <div id="{field}-field" class="field required">
  const requiredFields: string[] = [];
  const fieldRe = /<div[^>]+id=["']([a-z_]+)-field["'][^>]*>/gi;
  let m: RegExpExecArray | null;

  while ((m = fieldRe.exec(html)) !== null) {
    const fieldId = m[1];
    // Check the div's opening tag (300 chars) for a required class marker
    const snippet = html.slice(m.index, m.index + 300);
    const isRequired =
      /class=["'][^"']*\brequired\b[^"']*["']/.test(snippet) ||
      /aria-required=["']true["']/.test(snippet);

    if (isRequired) {
      const label = FIELD_LABELS[fieldId];
      if (label && !requiredFields.includes(label)) requiredFields.push(label);
    }
  }

  // 5. Resume and cover letter presence + required status
  const resumePresent      = /id=["']resume[_-]/.test(html) || /name=["']resume["']/.test(html);
  const coverLetterPresent = /id=["']cover_letter/.test(html) || /name=["']cover_letter/.test(html);

  const resumeRequired:      boolean | null = resumePresent      ? requiredFields.includes("Resume")       : null;
  const coverLetterRequired: boolean | null = coverLetterPresent ? requiredFields.includes("Cover Letter") : null;

  // 6. Custom questions
  //    Greenhouse encodes custom inputs as name="answers[N][value]"
  const customAnswerIds = new Set<string>();
  const answerRe = /answers\[(\d+)\]/g;
  while ((m = answerRe.exec(html)) !== null) customAnswerIds.add(m[1]);

  const customQuestions: string[] = [];
  for (const id of customAnswerIds) {
    const marker = `answers[${id}]`;
    const pos    = html.indexOf(marker);
    if (pos === -1) continue;

    // Look backwards up to 600 chars for the nearest preceding <label>
    const lookback   = html.slice(Math.max(0, pos - 600), pos);
    const labelMatch = lookback.match(/<label[^>]*>([\s\S]{1,300}?)<\/label>\s*$/i);
    if (!labelMatch) continue;

    const text = labelMatch[1]
      .replace(/<[^>]+>/g, "")     // strip inner tags (spans, etc.)
      .replace(/\s+/g, " ")
      .replace(/\*\s*$/, "")       // strip trailing asterisk
      .trim();

    if (text.length > 2 && text.length < 200 && !customQuestions.includes(text)) {
      customQuestions.push(text);
    }
  }

  // 7. Sponsorship and work authorization keyword detection
  const sponsorshipQuestionDetected = SPONSORSHIP_RE.test(html);
  const workAuthQuestionDetected    = WORK_AUTH_RE.test(html);

  return {
    detected:                    true,
    canAnalyze:                  true,
    autoSubmitPossible:          false,
    requiredFields,
    customQuestions,
    resumeRequired,
    coverLetterRequired,
    sponsorshipQuestionDetected,
    workAuthQuestionDetected,
    missingUserProfileFields:    [],   // future: compare against user profile fields
    reason:                      "Greenhouse application form analyzed successfully",
  };
}
