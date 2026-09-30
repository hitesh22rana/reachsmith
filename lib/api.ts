import * as v from "valibot";
import { errorMessage } from "./validators";

// The one place a client request turns into either parsed data or a thrown
// Error. Seven views hand-rolled the same ok-check, error text and parse, so
// a response-shape change was a seven-file edit and a typo surfaced as a
// different message per call site. `label` is what the user reads on failure
// ("targets"), not a URL.

export async function getJson<T>(
  url: string,
  schema: v.GenericSchema<T>,
  label: string,
): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${label} (${response.status})`);
  }
  return v.parse(schema, await response.json());
}

// Sends a validated body and validates the response, so a caller cannot
// forget either. The error prefers the server's own message, which is the one
// that names a validation failure.
export async function sendJson<T>(
  method: "POST" | "PATCH" | "DELETE",
  url: string,
  body: unknown,
  schema: v.GenericSchema<T>,
  label: string,
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const failure: unknown = await response.json().catch(() => null);
    throw new Error(errorMessage(failure, `Failed to ${label} (${response.status})`));
  }
  return v.parse(schema, await response.json());
}

// Every DELETE returns the id it removed.
export const DeletedSchema = v.object({ id: v.string() });
