import { createHash } from "node:crypto";
import type { Target } from "../db/schema.ts";
import { nameParts } from "./target-name.ts";

export function emailInputs(target: Target) {
  const { firstName, lastName } = nameParts(target);
  return {
    first_name: firstName, last_name: lastName, domain: target.domain,
    company_website: target.companyWebsite, notes: target.notes, social_urls: target.socialUrls,
  };
}

export function emailInputKey(target: Target): string {
  return createHash("sha256").update(JSON.stringify(emailInputs(target))).digest("hex");
}
