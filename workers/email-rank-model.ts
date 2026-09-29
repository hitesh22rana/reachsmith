import {
  getLlama,
  resolveModelFile,
  LlamaChatSession,
  type Llama,
} from "node-llama-cpp";

// Backend rank stage. Output shape is enforced at generation level by a
// JSON-schema grammar over candidate indices, so unknown IDs are
// unrepresentable and every response parses. Deterministic order stands
// on any failure.

interface RankInput {
  id: string;
  email: string;
  pattern: string;
  source: string;
}

// Pinned to the same revision the Dockerfile bakes (MODEL_SHA). Without the
// `#rev` fragment this resolves against `main`, so a moved tag would change
// the weights the worker loads.
const MODEL_FILE =
  "hf:Qwen/Qwen2.5-0.5B-Instruct-GGUF/qwen2.5-0.5b-instruct-q4_k_m.gguf" +
  "#9217f5db79a29953eb74d5343926648285ec7e67";
const MODEL_CACHE = process.env.HF_MODEL_CACHE ?? "./.hf-cache";

// One model, one context, one prompt at a time.
//
// The old guard held the *resolved* session, which does nothing while the
// first load is still in flight: the email-guess worker runs at concurrency
// 5, so five jobs entered here in the same tick, all saw null, and each
// loaded its own copy of the weights. Five model loads, five contexts, and
// four of them thrown away, which is what the repeated "control-looking
// token" line at startup was. That line itself is llama.cpp noticing a vocab
// entry that is named like a special token but is not typed as one; it
// overrides the type and carries on, so it is the count that is the signal,
// not the message.
//
// Memoizing the promise makes the session shared for real, so the prompts go
// through one queue too: two jobs prompting on the same context sequence
// would interleave and overwrite each other's chat history.
let llama: Llama | null = null;
let session: Promise<LlamaChatSession | null> | null = null;
let queue: Promise<unknown> = Promise.resolve();

function getSession(): Promise<LlamaChatSession | null> {
  session ??= (async () => {
    try {
      llama = await getLlama();
      // Second argument is a *directory*. Passing the file path used to make
      // ensureDir throw EEXIST, the catch below swallowed it, and the rank
      // stage never ran in the shipped image. The image bakes the file at this
      // directory, so nothing is fetched at runtime; the `#rev` pin above is
      // what keeps a local fallback download honest.
      const modelPath = await resolveModelFile(MODEL_FILE, MODEL_CACHE);
      const model = await llama?.loadModel({ modelPath });
      if (!model) {
        throw new Error("Model failed to load");
      }
      const context = await model.createContext();
      return new LlamaChatSession({ contextSequence: context.getSequence() });
    } catch (error) {
      console.error("SLM rank stage unavailable, using deterministic order", error);
      return null;
    }
  })();
  return session;
}

// Each call waits for the one before it, and a failure does not stall the
// chain: the next rank call is still worth attempting.
function serialize<T>(run: () => Promise<T>): Promise<T> {
  const result = queue.then(run, run);
  queue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function buildPrompt(
  target: { fullName: string; company: string | null },
  notes: string | null,
  handles: string[],
  candidates: RankInput[],
): string {
  const lines = candidates.map(
    (candidate, index) =>
      `${index}: ${candidate.email} (${candidate.source}, ${candidate.pattern})`,
  );
  return [
    `Rank these email candidates for ${target.fullName}${target.company ? ` at ${target.company}` : ""}, best first.`,
    `Notes: ${notes || "none"}.`,
    `Usernames this person uses elsewhere: ${handles.length > 0 ? handles.join(", ") : "none"}.`,
    ...lines,
    `Reply with JSON {"order":[candidate numbers, best first]} using only these numbers: ${candidates.map((_, index) => index).join(", ")}.`,
  ].join("\n");
}

// Reorder candidate IDs best-first. Returns null when the model is
// unavailable or its output is unusable; the caller keeps deterministic order.
export function rankWithModel(
  target: { fullName: string; company: string | null },
  notes: string | null,
  handles: string[],
  candidates: RankInput[],
): Promise<string[] | null> {
  if (candidates.length === 0) {
    return Promise.resolve(null);
  }
  return serialize(() => rank(target, notes, handles, candidates));
}

async function rank(
  target: { fullName: string; company: string | null },
  notes: string | null,
  handles: string[],
  candidates: RankInput[],
): Promise<string[] | null> {
  const active = await getSession();
  const engine = llama;
  if (!active || !engine) {
    return null;
  }
  try {
    const grammar = await engine.createGrammarForJsonSchema({
      type: "object",
      properties: {
        order: {
          type: "array",
          items: { enum: candidates.map((_, index) => index) },
        },
      },
      required: ["order"],
    });
    const response = await active.prompt(buildPrompt(target, notes, handles, candidates), {
      grammar,
      temperature: 0,
      maxTokens: 200,
    });
    const parsed = grammar.parse(response) as { order: number[] };
    const byIndex = new Map(candidates.map((candidate, index) => [index, candidate.id]));
    const ranked = [...new Set(parsed.order)]
      .map((index) => byIndex.get(index))
      .filter((id): id is string => id !== undefined);
    if (ranked.length === 0) {
      return null;
    }
    // Omitted candidates keep deterministic positions.
    const placed = new Set(ranked);
    for (const candidate of candidates) {
      if (!placed.has(candidate.id)) {
        placed.add(candidate.id);
        ranked.push(candidate.id);
      }
    }
    return ranked;
  } catch (error) {
    console.error("SLM ranking failed, using deterministic order", error);
    return null;
  }
}
