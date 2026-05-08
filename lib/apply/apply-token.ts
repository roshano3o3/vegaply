import { randomBytes, createHash } from "node:crypto";

export interface ApplyToken {
  rawToken:  string;
  tokenHash: string;
  expiresAt: Date;
}

export function generateApplyToken(): ApplyToken {
  const rawToken  = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return { rawToken, tokenHash, expiresAt };
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
