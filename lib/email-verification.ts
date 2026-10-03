import type { EmailVerification } from "../db/schema.ts";

// Simulated results never count as a live mailbox check.
export function hasVerification(result: EmailVerification | undefined, test: boolean): boolean {
  return Boolean(result && (!result.test || test));
}
