import { describe, it, expect, afterEach } from "vitest";
import { chunkEmbeddingInput, generateEmbeddings, getEmbeddingConfig, localEmbedding } from "./embeddings";
import { cosineSimilarity, deserializeEmbedding, rankBySimilarity, serializeEmbedding } from "./vector-search";

const ENV_KEYS = ["EMBEDDING_PROVIDER", "OPENAI_API_KEY", "LLM_PROVIDER", "LLM_API_KEY", "EMBEDDING_MODEL", "RAG_MIN_SIMILARITY"];
const savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

function clearEnv() {
  ENV_KEYS.forEach((k) => delete process.env[k]);
}

describe("getEmbeddingConfig", () => {
  it("uses local embeddings when no OpenAI key is available", () => {
    clearEnv();
    process.env.LLM_PROVIDER = "anthropic";
    process.env.LLM_API_KEY = "sk-ant-test";
    expect(getEmbeddingConfig()).toMatchObject({ provider: "local", model: "local-hash-v1" });
  });

  it("reuses the LLM key when the LLM provider is OpenAI", () => {
    clearEnv();
    process.env.LLM_PROVIDER = "openai";
    process.env.LLM_API_KEY = "sk-test";
    expect(getEmbeddingConfig()).toMatchObject({
      provider: "openai",
      model: "text-embedding-3-small",
      apiKey: "sk-test",
    });
  });

  it("prefers OPENAI_API_KEY and honours overrides", () => {
    clearEnv();
    process.env.OPENAI_API_KEY = "sk-openai";
    process.env.EMBEDDING_MODEL = "text-embedding-3-large";
    process.env.RAG_MIN_SIMILARITY = "0.4";
    expect(getEmbeddingConfig()).toMatchObject({
      provider: "openai",
      apiKey: "sk-openai",
      model: "text-embedding-3-large",
      minSimilarity: 0.4,
    });
  });

  it("can be forced to local", () => {
    clearEnv();
    process.env.OPENAI_API_KEY = "sk-openai";
    process.env.EMBEDDING_PROVIDER = "local";
    expect(getEmbeddingConfig().provider).toBe("local");
  });
});

describe("localEmbedding", () => {
  it("is deterministic and unit length", () => {
    const a = localEmbedding("Transformers use self-attention");
    expect(a).toEqual(localEmbedding("Transformers use self-attention"));
    const norm = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it("ranks lexically related text above unrelated text", () => {
    const query = localEmbedding("How is the confidence estimator trained?");
    const related = localEmbedding("We train the confidence estimator with supervised fine-tuning.");
    const unrelated = localEmbedding("Galaxies in the early universe formed quickly.");
    expect(cosineSimilarity(query, related)).toBeGreaterThan(cosineSimilarity(query, unrelated));
  });

  it("returns a zero vector for text without words", () => {
    expect(localEmbedding("!!! ---").every((v) => v === 0)).toBe(true);
  });
});

describe("generateEmbeddings (local)", () => {
  it("returns one vector per input in order", async () => {
    clearEnv();
    const vectors = await generateEmbeddings(["alpha beta", "", "gamma delta"]);
    expect(vectors).toHaveLength(3);
    expect(vectors[0]).toEqual(localEmbedding("alpha beta"));
    expect(vectors[2]).toEqual(localEmbedding("gamma delta"));
  });

  it("prefixes chunk text with its section title", () => {
    expect(chunkEmbeddingInput({ content: "Body", sectionTitle: "3 Method" })).toBe("3 Method\n\nBody");
    expect(chunkEmbeddingInput({ content: "Body", sectionTitle: null })).toBe("Body");
  });
});

describe("vector storage", () => {
  it("round-trips embeddings through bytes", () => {
    const vector = [0.25, -1.5, 3.125, 0];
    const bytes = serializeEmbedding(vector);
    expect(bytes.byteLength).toBe(16);
    expect(Array.from(deserializeEmbedding(bytes))).toEqual(vector);
  });

  it("deserializes from an unaligned byte view", () => {
    const bytes = serializeEmbedding([1, 2]);
    const padded = new Uint8Array(bytes.byteLength + 1);
    padded.set(bytes, 1);
    expect(Array.from(deserializeEmbedding(padded.subarray(1)))).toEqual([1, 2]);
  });

  it("computes cosine similarity", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
    expect(cosineSimilarity([0, 0], [1, 0])).toBe(0);
    expect(cosineSimilarity([1, 0], [1, 0, 0])).toBe(0);
  });

  it("ranks items by similarity, highest first", () => {
    const ranked = rankBySimilarity([1, 0], [
      { vector: Float32Array.from([0, 1]), item: "orthogonal" },
      { vector: Float32Array.from([1, 0.1]), item: "close" },
      { vector: Float32Array.from([1, 1]), item: "diagonal" },
    ]);
    expect(ranked.map((r) => r.item)).toEqual(["close", "diagonal", "orthogonal"]);
  });
});
