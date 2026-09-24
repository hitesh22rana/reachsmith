// Auth guard import point. The auth feature (docs/features/auth/SPEC.md)
// implements this via Better Auth; until then it fails closed.
export async function getUserId(): Promise<string> {
  // TODO(auth): return the Better Auth session user id
  throw new Error("Auth is not implemented yet");
}
