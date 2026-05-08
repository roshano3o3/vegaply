export type ApplyMethod =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workday"
  | "email"
  | "manual"
  | "unknown";

export interface ApplyMethodResult {
  method:    ApplyMethod;
  supported: boolean;
  reason:    string;
}

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;

export function detectApplyMethod(input: {
  job_apply_link:  string | null;
  employer_name?:  string | null;
  job_title?:      string | null;
}): ApplyMethodResult {
  const link = (input.job_apply_link ?? "").toLowerCase();

  if (link.includes("greenhouse.io")) {
    return {
      method:    "greenhouse",
      supported: false,
      reason:    "Greenhouse detected — automatic submission coming soon",
    };
  }

  if (link.includes("lever.co")) {
    return {
      method:    "lever",
      supported: false,
      reason:    "Lever detected — automatic submission coming soon",
    };
  }

  if (link.includes("ashbyhq.com")) {
    return {
      method:    "ashby",
      supported: false,
      reason:    "Ashby detected — automatic submission coming soon",
    };
  }

  if (link.includes("workday")) {
    return {
      method:    "workday",
      supported: false,
      reason:    "Workday detected — automatic submission coming soon",
    };
  }

  // mailto: links or apply links that are bare email addresses
  if (link.startsWith("mailto:") || EMAIL_RE.test(input.job_apply_link ?? "")) {
    return {
      method:    "email",
      supported: false,
      reason:    "Email application detected — automatic email submission coming soon",
    };
  }

  if (input.job_apply_link) {
    return {
      method:    "manual",
      supported: false,
      reason:    "Manual company application required",
    };
  }

  return {
    method:    "unknown",
    supported: false,
    reason:    "Apply link unavailable",
  };
}
