import * as v from "valibot";

const ProviderEmailSchema = v.object({
  email: v.pipe(v.string(), v.email()),
  state: v.picklist(["deliverable", "undeliverable", "risky", "unknown", "duplicate"]),
  reason: v.nullable(v.string()),
  accept_all: v.nullable(v.boolean()),
  score: v.nullable(v.pipe(v.number(), v.minValue(0), v.maxValue(100))),
});
const BatchSchema = v.object({
  id: v.string(),
  emails: v.optional(v.array(ProviderEmailSchema), []),
  total_counts: v.optional(v.object({ processed: v.number(), total: v.number() })),
});

// Worker-only HTTP calls. No SDK, browser key, callback URL, or address logging.
async function request(path: string, body?: unknown): Promise<unknown> {
  const key = process.env.EMAILABLE_API_KEY;
  if (!key) throw new Error("Email verification service is not configured.");
  let response: Response;
  try {
    response = await fetch(`https://api.emailable.com/v1/${path}`, {
      method: body ? "POST" : "GET",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new Error("Email verification service connection failed. Submission may have been accepted; it was not automatically repeated.");
  }
  if (!response.ok) {
    const messages: Record<number, string> = {
      402: "Email verification service has insufficient credits or a billing issue.",
      403: "Email verification service rejected the key or its IP restrictions.",
      429: "Email verification service rate limit reached. Try again later.",
    };
    throw new Error(messages[response.status] ?? `Email verification service request failed (${response.status}).`);
  }
  return response.json();
}

export async function submitBatch(emails: string[]): Promise<string> {
  if (emails.length < 1 || emails.length > 1000) throw new Error("Batch must contain 1 to 1,000 addresses.");
  if (process.env.EMAILABLE_API_KEY?.startsWith("live_")) {
    const account = v.parse(v.object({ available_credits: v.number() }), await request("account"));
    if (account.available_credits < emails.length) throw new Error("Not enough Email verification service credits for this batch. No batch was submitted.");
  }
  const result = v.parse(v.object({ id: v.pipe(v.string(), v.minLength(1)) }), await request("batch", {
    emails, response_fields: "email,state,reason,accept_all,score", retries: true,
  }));
  return result.id;
}

export async function readBatch(id: string) {
  const batch = v.parse(BatchSchema, await request(`batch?id=${encodeURIComponent(id)}&partial=true`));
  if (batch.id !== id) throw new Error("Email verification service returned a different batch.");
  return batch;
}
