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

let llama: Llama | null = null;
let session: LlamaChatSession | null = null;
let loadFailed = false;

async function getSession(): Promise<LlamaChatSession | null> {
  if (session || loadFailed) {
    return session;
  }
  try {
    llama = await getLlama();
    // Second argument is a *directory*. Passing the file path used to make
    // ensureDir throw EEXIST, the catch below swallowed it, and the rank
    // stage never ran in the shipped image. The image bakes the file at this
    // directory, so nothing is fetched at runtime; the `#rev` pin above is
    // what keeps a local fallback download honest.
    const modelPath = await resolveModelFile(MODEL_FILE, MODEL_CACHE);
    const model = await llama.loadModel({ modelPath });
    const context = await model.createContext();
    session = new LlamaChatSession({ contextSequence: context.getSequence() });
    return session;
  } catch (error) {
    console.error("SLM rank stage unavailable, using deterministic order", error);
    loadFailed = true;
    return null;
  }
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
export async function rankWithModel(
  target: { fullName: string; company: string | null },
  notes: string | null,
  handles: string[],
  candidates: RankInput[],
): Promise<string[] | null> {
  if (candidates.length === 0) {
    return null;
  }
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
