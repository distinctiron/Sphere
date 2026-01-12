/**
 * Tests for LLM Service (Novelty Scoring)
 * 
 * Tests both mock and real LLM implementations when API keys are provided.
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import { scoreNovelty, type NoveltyScoreResponse, chatWithPaperStreaming } from "./llm";

// Sample paper data for testing
const samplePaper = {
  title: "Novel Approaches to Quantum Machine Learning",
  abstract:
    "We propose a groundbreaking framework that combines quantum computing principles with machine learning to achieve unprecedented computational efficiency. Our method introduces a new paradigm that fundamentally changes how we approach optimization problems in AI. The approach demonstrates significant improvements in both accuracy and speed, with real-world applications ranging from drug discovery to financial modeling. This work opens new research directions and challenges existing assumptions about the limitations of classical machine learning.",
  authors: [
    { name: "Dr. Jane Smith" },
    { name: "Prof. John Doe" },
    { name: "Dr. Alice Johnson" },
  ],
  categories: ["cs.AI", "cs.LG", "quant-ph"],
};

describe("LLM Service - Novelty Scoring", () => {
  describe("Mock Implementation", () => {
    it("should return a valid score in the 0-10 range", async () => {
      // Mock mode is used when LLM_PROVIDER is not set or is "mock"
      const originalProvider = process.env.LLM_PROVIDER;
      const originalApiKey = process.env.LLM_API_KEY;

      // Ensure we're in mock mode
      delete process.env.LLM_PROVIDER;
      delete process.env.LLM_API_KEY;

      const result = await scoreNovelty(
        samplePaper.title,
        samplePaper.abstract,
        samplePaper.authors,
        samplePaper.categories
      );

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(10);
      expect(typeof result.summary).toBe("string");
      expect(result.summary.length).toBeGreaterThan(0);

      // Restore original env vars
      if (originalProvider) process.env.LLM_PROVIDER = originalProvider;
      if (originalApiKey) process.env.LLM_API_KEY = originalApiKey;
    });

    it("should return a score with one decimal place", async () => {
      const originalProvider = process.env.LLM_PROVIDER;
      const originalApiKey = process.env.LLM_API_KEY;

      delete process.env.LLM_PROVIDER;
      delete process.env.LLM_API_KEY;

      const result = await scoreNovelty(
        samplePaper.title,
        samplePaper.abstract,
        samplePaper.authors,
        samplePaper.categories
      );

      // Score should be rounded to 1 decimal place
      const decimalPlaces = result.score.toString().split(".")[1]?.length || 0;
      expect(decimalPlaces).toBeLessThanOrEqual(1);

      if (originalProvider) process.env.LLM_PROVIDER = originalProvider;
      if (originalApiKey) process.env.LLM_API_KEY = originalApiKey;
    });

    it("should return a summary string", async () => {
      const originalProvider = process.env.LLM_PROVIDER;
      const originalApiKey = process.env.LLM_API_KEY;

      delete process.env.LLM_PROVIDER;
      delete process.env.LLM_API_KEY;

      const result = await scoreNovelty(
        samplePaper.title,
        samplePaper.abstract,
        samplePaper.authors,
        samplePaper.categories
      );

      expect(result.summary).toBeDefined();
      expect(typeof result.summary).toBe("string");
      expect(result.summary.trim().length).toBeGreaterThan(0);

      if (originalProvider) process.env.LLM_PROVIDER = originalProvider;
      if (originalApiKey) process.env.LLM_API_KEY = originalApiKey;
    });

    it("should handle papers with minimal abstract", async () => {
      const originalProvider = process.env.LLM_PROVIDER;
      const originalApiKey = process.env.LLM_API_KEY;

      delete process.env.LLM_PROVIDER;
      delete process.env.LLM_API_KEY;

      const result = await scoreNovelty(
        "Short Paper",
        "This is a very short abstract.",
        [{ name: "Author" }],
        ["cs.AI"]
      );

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(10);
      expect(result.summary).toBeDefined();

      if (originalProvider) process.env.LLM_PROVIDER = originalProvider;
      if (originalApiKey) process.env.LLM_API_KEY = originalApiKey;
    });

    it("should handle papers with multiple categories", async () => {
      const originalProvider = process.env.LLM_PROVIDER;
      const originalApiKey = process.env.LLM_API_KEY;

      delete process.env.LLM_PROVIDER;
      delete process.env.LLM_API_KEY;

      const result = await scoreNovelty(
        samplePaper.title,
        samplePaper.abstract,
        samplePaper.authors,
        ["cs.AI", "cs.LG", "cs.CV", "cs.NE", "stat.ML"]
      );

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(10);
      expect(result.summary).toBeDefined();

      if (originalProvider) process.env.LLM_PROVIDER = originalProvider;
      if (originalApiKey) process.env.LLM_API_KEY = originalApiKey;
    });

    it("should handle papers with single author", async () => {
      const originalProvider = process.env.LLM_PROVIDER;
      const originalApiKey = process.env.LLM_API_KEY;

      delete process.env.LLM_PROVIDER;
      delete process.env.LLM_API_KEY;

      const result = await scoreNovelty(
        "Single Author Paper",
        samplePaper.abstract,
        [{ name: "Single Author" }],
        samplePaper.categories
      );

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(10);
      expect(result.summary).toBeDefined();

      if (originalProvider) process.env.LLM_PROVIDER = originalProvider;
      if (originalApiKey) process.env.LLM_API_KEY = originalApiKey;
    });
  });

  describe("Response Structure", () => {
    it("should return NoveltyScoreResponse with correct structure", async () => {
      const originalProvider = process.env.LLM_PROVIDER;
      const originalApiKey = process.env.LLM_API_KEY;

      delete process.env.LLM_PROVIDER;
      delete process.env.LLM_API_KEY;

      const result = await scoreNovelty(
        samplePaper.title,
        samplePaper.abstract,
        samplePaper.authors,
        samplePaper.categories
      );

      // TypeScript type check
      const response: NoveltyScoreResponse = result;

      expect(response).toHaveProperty("score");
      expect(response).toHaveProperty("summary");
      expect(Object.keys(response).length).toBe(2); // Only score and summary

      if (originalProvider) process.env.LLM_PROVIDER = originalProvider;
      if (originalApiKey) process.env.LLM_API_KEY = originalApiKey;
    });
  });

  // Skip real LLM tests if API keys are not provided
  describe.skipIf(!process.env.LLM_API_KEY || process.env.LLM_PROVIDER === "mock")(
    "Real LLM Implementation (requires API key)",
    () => {
      beforeAll(() => {
        if (!process.env.LLM_API_KEY) {
          console.warn("⚠️  Skipping real LLM tests - LLM_API_KEY not set");
        }
        if (process.env.LLM_PROVIDER === "mock") {
          console.warn("⚠️  Skipping real LLM tests - LLM_PROVIDER is set to 'mock'");
        }
      });

      it("should score a groundbreaking paper with OpenAI", async () => {
        if (process.env.LLM_PROVIDER !== "openai") {
          console.log("Skipping OpenAI test - LLM_PROVIDER is not 'openai'");
          return;
        }

        const result = await scoreNovelty(
          samplePaper.title,
          samplePaper.abstract,
          samplePaper.authors,
          samplePaper.categories
        );

        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(10);
        expect(result.summary).toBeDefined();
        expect(result.summary.length).toBeGreaterThan(50); // Real LLM should give detailed summaries
      }, 30000); // 30 second timeout for API calls

      it("should score a groundbreaking paper with Anthropic", async () => {
        if (process.env.LLM_PROVIDER !== "anthropic") {
          console.log("Skipping Anthropic test - LLM_PROVIDER is not 'anthropic'");
          return;
        }

        const result = await scoreNovelty(
          samplePaper.title,
          samplePaper.abstract,
          samplePaper.authors,
          samplePaper.categories
        );

        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(10);
        expect(result.summary).toBeDefined();
        expect(result.summary.length).toBeGreaterThan(50); // Real LLM should give detailed summaries
      }, 30000); // 30 second timeout for API calls

      it("should handle API errors gracefully", async () => {
        // Test with invalid API key (if OpenAI)
        if (process.env.LLM_PROVIDER === "openai") {
          const originalKey = process.env.LLM_API_KEY;
          process.env.LLM_API_KEY = "invalid-key";

          await expect(
            scoreNovelty(
              samplePaper.title,
              samplePaper.abstract,
              samplePaper.authors,
              samplePaper.categories
            )
          ).rejects.toThrow();

          if (originalKey) process.env.LLM_API_KEY = originalKey;
        }
      }, 30000);
    }
  );

  describe("Edge Cases", () => {
    it("should handle empty abstract", async () => {
      const originalProvider = process.env.LLM_PROVIDER;
      const originalApiKey = process.env.LLM_API_KEY;

      delete process.env.LLM_PROVIDER;
      delete process.env.LLM_API_KEY;

      const result = await scoreNovelty(
        "Empty Abstract Paper",
        "",
        [{ name: "Author" }],
        ["cs.AI"]
      );

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(10);
      expect(result.summary).toBeDefined();

      if (originalProvider) process.env.LLM_PROVIDER = originalProvider;
      if (originalApiKey) process.env.LLM_API_KEY = originalApiKey;
    });

    it("should handle very long abstract", async () => {
      const originalProvider = process.env.LLM_PROVIDER;
      const originalApiKey = process.env.LLM_API_KEY;

      delete process.env.LLM_PROVIDER;
      delete process.env.LLM_API_KEY;

      const longAbstract = "This is a very long abstract. ".repeat(100);
      const result = await scoreNovelty(
        "Long Abstract Paper",
        longAbstract,
        [{ name: "Author" }],
        ["cs.AI"]
      );

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(10);
      expect(result.summary).toBeDefined();

      if (originalProvider) process.env.LLM_PROVIDER = originalProvider;
      if (originalApiKey) process.env.LLM_API_KEY = originalApiKey;
    });

    it("should handle empty categories array", async () => {
      const originalProvider = process.env.LLM_PROVIDER;
      const originalApiKey = process.env.LLM_API_KEY;

      delete process.env.LLM_PROVIDER;
      delete process.env.LLM_API_KEY;

      const result = await scoreNovelty(
        samplePaper.title,
        samplePaper.abstract,
        samplePaper.authors,
        []
      );

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(10);
      expect(result.summary).toBeDefined();

      if (originalProvider) process.env.LLM_PROVIDER = originalProvider;
      if (originalApiKey) process.env.LLM_API_KEY = originalApiKey;
    });

    it("should handle empty authors array", async () => {
      const originalProvider = process.env.LLM_PROVIDER;
      const originalApiKey = process.env.LLM_API_KEY;

      delete process.env.LLM_PROVIDER;
      delete process.env.LLM_API_KEY;

      const result = await scoreNovelty(
        samplePaper.title,
        samplePaper.abstract,
        [],
        samplePaper.categories
      );

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(10);
      expect(result.summary).toBeDefined();

      if (originalProvider) process.env.LLM_PROVIDER = originalProvider;
      if (originalApiKey) process.env.LLM_API_KEY = originalApiKey;
    });
  });
});

/**
 * Tests for LLM Service - Chat with Paper (Streaming)
 * Tests streaming chat functionality for Deep Dive feature
 */

// Sample paper context for chat testing
const samplePaperContext = {
  title: "Novel Approaches to Quantum Machine Learning",
  abstract:
    "We propose a groundbreaking framework that combines quantum computing principles with machine learning to achieve unprecedented computational efficiency.",
  fullContent: "<html><body><h1>Full Paper Content</h1><p>This is the full HTML content of the paper.</p></body></html>",
};

describe("LLM Service - Chat with Paper (Streaming)", () => {
  describe("Mock Implementation", () => {
    it("should stream chunks for a chat message", async () => {
      const originalProvider = process.env.LLM_PROVIDER;
      const originalApiKey = process.env.LLM_API_KEY;

      // Ensure we're in mock mode
      delete process.env.LLM_PROVIDER;
      delete process.env.LLM_API_KEY;

      const chunks: string[] = [];
      const onChunk = (chunk: string) => {
        chunks.push(chunk);
      };

      await chatWithPaperStreaming(
        "What is the main contribution of this paper?",
        samplePaperContext,
        [],
        onChunk
      );

      expect(chunks.length).toBeGreaterThan(0);
      const fullResponse = chunks.join("");
      expect(fullResponse).toBeDefined();
      expect(typeof fullResponse).toBe("string");
      expect(fullResponse.length).toBeGreaterThan(0);

      // Restore original env vars
      if (originalProvider) process.env.LLM_PROVIDER = originalProvider;
      if (originalApiKey) process.env.LLM_API_KEY = originalApiKey;
    }, 10000);

    it("should handle conversation history", async () => {
      const originalProvider = process.env.LLM_PROVIDER;
      const originalApiKey = process.env.LLM_API_KEY;

      delete process.env.LLM_PROVIDER;
      delete process.env.LLM_API_KEY;

      const chunks: string[] = [];
      const onChunk = (chunk: string) => {
        chunks.push(chunk);
      };

      const conversationHistory = [
        { role: "user" as const, content: "What is quantum computing?" },
        { role: "assistant" as const, content: "Quantum computing uses quantum mechanical phenomena..." },
      ];

      await chatWithPaperStreaming(
        "How does it relate to this paper?",
        samplePaperContext,
        conversationHistory,
        onChunk
      );

      expect(chunks.length).toBeGreaterThan(0);
      const fullResponse = chunks.join("");
      expect(fullResponse).toBeDefined();

      if (originalProvider) process.env.LLM_PROVIDER = originalProvider;
      if (originalApiKey) process.env.LLM_API_KEY = originalApiKey;
    }, 10000);

    it("should handle empty conversation history", async () => {
      const originalProvider = process.env.LLM_PROVIDER;
      const originalApiKey = process.env.LLM_API_KEY;

      delete process.env.LLM_PROVIDER;
      delete process.env.LLM_API_KEY;

      const chunks: string[] = [];
      const onChunk = (chunk: string) => {
        chunks.push(chunk);
      };

      await chatWithPaperStreaming(
        "What is this paper about?",
        samplePaperContext,
        [],
        onChunk
      );

      expect(chunks.length).toBeGreaterThan(0);

      if (originalProvider) process.env.LLM_PROVIDER = originalProvider;
      if (originalApiKey) process.env.LLM_API_KEY = originalApiKey;
    }, 10000);

    it("should handle paper context without fullContent", async () => {
      const originalProvider = process.env.LLM_PROVIDER;
      const originalApiKey = process.env.LLM_API_KEY;

      delete process.env.LLM_PROVIDER;
      delete process.env.LLM_API_KEY;

      const chunks: string[] = [];
      const onChunk = (chunk: string) => {
        chunks.push(chunk);
      };

      const paperContextWithoutFull = {
        title: samplePaperContext.title,
        abstract: samplePaperContext.abstract,
      };

      await chatWithPaperStreaming(
        "Explain the methodology",
        paperContextWithoutFull,
        [],
        onChunk
      );

      expect(chunks.length).toBeGreaterThan(0);

      if (originalProvider) process.env.LLM_PROVIDER = originalProvider;
      if (originalApiKey) process.env.LLM_API_KEY = originalApiKey;
    }, 10000);
  });

  // Skip real LLM tests if API keys are not provided
  describe.skipIf(!process.env.LLM_API_KEY || process.env.LLM_PROVIDER === "mock")(
    "Real LLM Implementation (requires API key)",
    () => {
      beforeAll(() => {
        if (!process.env.LLM_API_KEY) {
          console.warn("⚠️  Skipping real LLM chat tests - LLM_API_KEY not set");
        }
        if (process.env.LLM_PROVIDER === "mock") {
          console.warn("⚠️  Skipping real LLM chat tests - LLM_PROVIDER is set to 'mock'");
        }
      });

      it("should stream chat response with OpenAI", async () => {
        if (process.env.LLM_PROVIDER !== "openai") {
          console.log("Skipping OpenAI chat test - LLM_PROVIDER is not 'openai'");
          return;
        }

        const chunks: string[] = [];
        const onChunk = (chunk: string) => {
          chunks.push(chunk);
        };

        await chatWithPaperStreaming(
          "What is the main contribution?",
          samplePaperContext,
          [],
          onChunk
        );

        expect(chunks.length).toBeGreaterThan(0);
        const fullResponse = chunks.join("");
        expect(fullResponse.length).toBeGreaterThan(50);
      }, 30000);

      it("should stream chat response with Anthropic", async () => {
        if (process.env.LLM_PROVIDER !== "anthropic") {
          console.log("Skipping Anthropic chat test - LLM_PROVIDER is not 'anthropic'");
          return;
        }

        const chunks: string[] = [];
        const onChunk = (chunk: string) => {
          chunks.push(chunk);
        };

        await chatWithPaperStreaming(
          "What is the main contribution?",
          samplePaperContext,
          [],
          onChunk
        );

        expect(chunks.length).toBeGreaterThan(0);
        const fullResponse = chunks.join("");
        expect(fullResponse.length).toBeGreaterThan(50);
      }, 30000);
    }
  );
});

