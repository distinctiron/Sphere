/**
 * LLM Service Abstraction
 * 
 * Provides a consistent interface for LLM API calls (novelty scoring, explanations, chat)
 * Supports multiple providers (OpenAI, Anthropic, etc.) via environment configuration
 */

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

// Zod schema for novelty score response
const NoveltyScoreSchema = z.object({
  score: z.number().min(0).max(10),
  summary: z.string(),
});

export interface NoveltyScoreResponse {
  score: number; // 0-10
  summary: string; // Explanation of why it's novel
}

interface LLMConfig {
  provider: "openai" | "anthropic" | "mock";
  apiKey?: string;
  model?: string;
}

/**
 * Get LLM configuration from environment variables
 * Reads from .env.local or .env file (Next.js automatically loads these)
 */
function getLLMConfig(): LLMConfig {
  const provider = (process.env.LLM_PROVIDER as "openai" | "anthropic" | "mock") || "mock";
  const apiKey = process.env.LLM_API_KEY;

  console.log("LLM_PROVIDER", provider);
  
  // Warn if provider is not mock but no API key is provided
  if (provider !== "mock" && !apiKey) {
    console.warn(
      `⚠️  LLM_PROVIDER is set to "${provider}" but LLM_API_KEY is not set. Falling back to mock mode.`
    );
    return {
      provider: "mock",
      apiKey: undefined,
      model: undefined,
    };
  }
  
  return {
    provider,
    apiKey,
    model: process.env.LLM_MODEL || (provider === "openai" ? "gpt-4o-2024-08-06" : provider === "anthropic" ? "claude-sonnet-4-5" : undefined),
  };
}

/**
 * Score a paper for novelty using LLM
 * 
 * @param title - Paper title
 * @param abstract - Paper abstract
 * @param authors - Paper authors
 * @param categories - Paper categories
 * @returns Novelty score (0-10) and summary explanation
 */
export async function scoreNovelty(
  title: string,
  abstract: string,
  authors: Array<{ name: string }>,
  categories: string[]
): Promise<NoveltyScoreResponse> {
  const config = getLLMConfig();

  // Mock implementation for development/testing (when no API key provided)
  if (config.provider === "mock" || !config.apiKey) {
    console.warn("Using mock novelty scoring. Set LLM_PROVIDER and LLM_API_KEY to use real LLM scoring.");
    return mockNoveltyScoring(title, abstract, authors, categories);
  }

  // Real LLM implementation
  if (config.provider === "openai") {
    return scoreNoveltyWithOpenAI(title, abstract, authors, categories, config);
  }

  if (config.provider === "anthropic") {
    return scoreNoveltyWithAnthropic(title, abstract, authors, categories, config);
  }

  // Fallback to mock
  return mockNoveltyScoring(title, abstract, authors, categories);
}

/**
 * Create the prompt for novelty scoring
 * Note: No JSON formatting instructions - structured output is handled by the API
 */
function createNoveltyScoringPrompt(
  title: string,
  abstract: string,
  authors: Array<{ name: string }>,
  categories: string[]
): string {
  const authorsList = authors.map((a) => a.name).join(", ");
  const categoriesList = categories.join(", ");

  return `You are a research assistant whose job is to assess the novelty and groundbreaking potential of academic papers.

Your task is to evaluate the following paper and provide a novelty score from 0 to 10, along with a clear explanation.

**Paper Details:**
Title: ${title}
Authors: ${authorsList}
Categories: ${categoriesList}

**Abstract:**
${abstract}

**Evaluation Criteria:**

Assess the paper's groundbreaking potential based on three key dimensions:

1. **Magnitude of Advancement**: How significant is the advancement described? Does it represent a major leap forward or an incremental improvement?

2. **Real-World Implications**: What are the practical use cases and real-world applications? How transformative are the potential applications?

3. **Paradigm Shift**: How much does this paper change our fundamental understanding of the field? Does it introduce new ways of thinking, challenge existing assumptions, or open up new research directions?

**Scoring Guidelines:**
- 9-10: Revolutionary breakthrough that fundamentally changes the field, opens major new research directions, and has transformative real-world applications
- 7-8: Significant advancement with substantial implications and notable paradigm shifts
- 5-6: Moderate advancement with some novel contributions and reasonable applications
- 3-4: Incremental improvement with limited novelty and constrained applications
- 0-2: Minor extension of existing work with minimal novelty

Provide a clear, concise explanation (2-4 sentences) explaining the novelty score based on the three criteria above. Focus on what makes this paper groundbreaking or incremental, its real-world potential, and how it changes understanding of the field.`;
}

/**
 * Score paper novelty using OpenAI API with structured outputs
 */
async function scoreNoveltyWithOpenAI(
  title: string,
  abstract: string,
  authors: Array<{ name: string }>,
  categories: string[],
  config: LLMConfig
): Promise<NoveltyScoreResponse> {
  const prompt = createNoveltyScoringPrompt(title, abstract, authors, categories);

  try {
    const openai = new OpenAI({
      apiKey: config.apiKey,
    });

    const response = await openai.responses.parse({
      model: config.model!,
      input: [
        {
          role: "system",
          content:
            "You are a research assistant specializing in evaluating academic papers.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      text: {
        format: zodTextFormat(NoveltyScoreSchema, "novelty_score"),
      },
    });

    const parsed = response.output_parsed;

    if (!parsed) {
      throw new Error("No parsed output from OpenAI response");
    }

    // Validate the parsed response matches our schema
    const validated = NoveltyScoreSchema.parse(parsed);

    // Clamp score to 0-10 (should already be validated by schema, but extra safety)
    const score = Math.min(10, Math.max(0, validated.score));

    return {
      score: Math.round(score * 10) / 10, // Round to 1 decimal
      summary: validated.summary.trim(),
    };
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    throw error;
  }
}

/**
 * Score paper novelty using Anthropic API with structured outputs
 */
async function scoreNoveltyWithAnthropic(
  title: string,
  abstract: string,
  authors: Array<{ name: string }>,
  categories: string[],
  config: LLMConfig
): Promise<NoveltyScoreResponse> {
  const prompt = createNoveltyScoringPrompt(title, abstract, authors, categories);

  try {
    const client = new Anthropic({
      apiKey: config.apiKey,
    });

    const response = await client.beta.messages.parse({
      model: config.model!,
      max_tokens: 1024,
      betas: ["structured-outputs-2025-11-13"],
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      system: "You are a research assistant specializing in evaluating academic papers.",
      output_format: betaZodOutputFormat(NoveltyScoreSchema),
    });

    const parsed = response.parsed_output;

    if (!parsed) {
      throw new Error("No parsed output from Anthropic response");
    }

    // Validate the parsed response matches our schema
    const validated = NoveltyScoreSchema.parse(parsed);

    // Clamp score to 0-10 (should already be validated by schema, but extra safety)
    const score = Math.min(10, Math.max(0, validated.score));

    return {
      score: Math.round(score * 10) / 10, // Round to 1 decimal
      summary: validated.summary.trim(),
    };
  } catch (error) {
    console.error("Error calling Anthropic API:", error);
    throw error;
  }
}

/**
 * Mock novelty scoring for development (when no API key is provided)
 * This is a placeholder - real scoring should use LLM with proper prompts
 */
function mockNoveltyScoring(
  title: string,
  abstract: string,
  authors: Array<{ name: string }>,
  categories: string[]
): NoveltyScoreResponse {
  // Placeholder mock - always returns a middle score
  // Real implementation should use LLM with the proper prompt
  return {
    score: 5.0,
    summary:
      "Mock scoring: This is a placeholder. Configure LLM_PROVIDER and LLM_API_KEY in your .env.local file to enable real novelty scoring based on the paper's groundbreaking potential, real-world implications, and paradigm-shifting contributions.",
  };
}

/**
 * Generate explanation for selected text (for Intellisense feature)
 * This will be implemented in Story 3.4
 */
export async function explainText(
  text: string,
  paperContext: { title: string; abstract: string }
): Promise<string> {
  const config = getLLMConfig();
  
  if (config.provider === "mock") {
    return `This term refers to ${text.toLowerCase()} in the context of ${paperContext.title}. It's a key concept in the paper's methodology.`;
  }
  
  // Real LLM implementation would go here
  return `Explanation for: ${text}`;
}

/**
 * Generate explanation for selected text with streaming support (for Intellisense feature)
 * Streams the explanation as it's generated
 */
export async function explainTextStreaming(
  text: string,
  paperContext: { title: string; abstract: string },
  onChunk: (chunk: string) => void
): Promise<void> {
  const config = getLLMConfig();
  
  // Mock implementation for development/testing
  if (config.provider === "mock" || !config.apiKey) {
    const mockExplanation = `This term refers to "${text}" in the context of ${paperContext.title}. It's a key concept in the paper's methodology.`;
    // Simulate streaming by sending chunks
    const words = mockExplanation.split(" ");
    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      onChunk(words[i] + (i < words.length - 1 ? " " : ""));
    }
    return;
  }

  // Real LLM implementation
  if (config.provider === "openai") {
    return explainTextStreamingOpenAI(text, paperContext, config, onChunk);
  }

  if (config.provider === "anthropic") {
    return explainTextStreamingAnthropic(text, paperContext, config, onChunk);
  }

  // Fallback to mock
  const mockExplanation = `Explanation for: ${text}`;
  const words = mockExplanation.split(" ");
  for (let i = 0; i < words.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 50));
    onChunk(words[i] + (i < words.length - 1 ? " " : ""));
  }
}

/**
 * Create the prompt for text explanation
 */
function createExplanationPrompt(
  text: string,
  paperContext: { title: string; abstract: string }
): string {
  return `You are a helpful research assistant. Explain the following term or phrase from an academic paper in clear, accessible language.

**Paper Context:**
Title: ${paperContext.title}
Abstract: ${paperContext.abstract.substring(0, 500)}${paperContext.abstract.length > 500 ? "..." : ""}

**Term/Phrase to Explain:**
${text}

**Instructions:**
- Provide a simple, clear explanation (2-4 sentences)
- Use plain language, avoid jargon when possible
- If helpful, provide an analogy or real-world comparison
- Reference how it's used in this specific paper's context
- Write in a conversational, educational tone`;
}

/**
 * Stream explanation using OpenAI API
 */
async function explainTextStreamingOpenAI(
  text: string,
  paperContext: { title: string; abstract: string },
  config: LLMConfig,
  onChunk: (chunk: string) => void
): Promise<void> {
  const prompt = createExplanationPrompt(text, paperContext);

  try {
    const openai = new OpenAI({
      apiKey: config.apiKey,
    });

    const stream = await openai.chat.completions.create({
      model: config.model || "gpt-4o-2024-08-06",
      messages: [
        {
          role: "system",
          content: "You are a helpful research assistant that explains academic concepts in clear, accessible language.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 300,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        onChunk(content);
      }
    }
  } catch (error) {
    console.error("Error calling OpenAI API for explanation:", error);
    throw error;
  }
}

/**
 * Stream explanation using Anthropic API
 */
async function explainTextStreamingAnthropic(
  text: string,
  paperContext: { title: string; abstract: string },
  config: LLMConfig,
  onChunk: (chunk: string) => void
): Promise<void> {
  const prompt = createExplanationPrompt(text, paperContext);

  try {
    const client = new Anthropic({
      apiKey: config.apiKey,
    });

    const stream = await client.messages.stream({
      model: config.model || "claude-sonnet-4-20250514",
      max_tokens: 300,
      temperature: 0.7,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      system: "You are a helpful research assistant that explains academic concepts in clear, accessible language.",
    });

    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
        onChunk(chunk.delta.text);
      }
    }
  } catch (error) {
    console.error("Error calling Anthropic API for explanation:", error);
    throw error;
  }
}

/**
 * Create the prompt for chat with paper
 * Includes full paper context, conversation history, and educational teaching style
 */
function createChatPrompt(
  message: string,
  paperContext: { title: string; abstract: string; fullContent?: string },
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>
): string {
  const paperContent = paperContext.fullContent 
    ? `\n\n**Full Paper Content:**\n${paperContext.fullContent.substring(0, 100000)}${paperContext.fullContent.length > 100000 ? "\n[... content truncated for length ...]" : ""}`
    : `\n\n**Abstract:**\n${paperContext.abstract}`;

  return `You are a sophisticated research assistant and educational tutor helping a researcher understand an academic paper deeply.

**Paper Context:**
Title: ${paperContext.title}
${paperContent}

**Your Role:**
- Act as a teacher, not a simple chatbot
- Provide educational explanations that break down complex concepts
- Adapt your teaching style based on the user's questions and level of understanding
- Reference specific sections, equations, and figures when relevant
- Provide step-by-step explanations and learning paths when helpful
- Break down complex ideas into simpler components
- Guide the user's understanding through thoughtful, structured responses

**Instructions:**
- Provide detailed, cited responses referencing specific sections (e.g., "Section 3.2", "Figure 1", "Equation 5")
- Include visual citations (section numbers, page references) in your responses
- When discussing methodology, results, or implications, provide comprehensive explanations
- If asked about references or related concepts, discuss them in an educational manner
- Use markdown formatting (code blocks, lists, emphasis) for clarity
- Maintain context from the conversation history while providing fresh insights
- Write in a conversational yet scholarly tone

**Current Question:**
${message}`;
}

/**
 * Generate chat response with streaming support (for Deep Dive feature)
 * Streams the response as it's generated
 */
export async function chatWithPaperStreaming(
  message: string,
  paperContext: { title: string; abstract: string; fullContent?: string },
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  onChunk: (chunk: string) => void
): Promise<void> {
  const config = getLLMConfig();
  
  // Mock implementation for development/testing
  if (config.provider === "mock" || !config.apiKey) {
    const mockResponse = `I understand you're asking about "${message}" in the context of ${paperContext.title}. This is an interesting question that relates to the paper's main contributions. Let me explore this further based on the paper's content.`;
    // Simulate streaming by sending chunks
    const words = mockResponse.split(" ");
    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      onChunk(words[i] + (i < words.length - 1 ? " " : ""));
    }
    return;
  }

  // Real LLM implementation
  if (config.provider === "openai") {
    return chatWithPaperStreamingOpenAI(message, paperContext, conversationHistory, config, onChunk);
  }

  if (config.provider === "anthropic") {
    return chatWithPaperStreamingAnthropic(message, paperContext, conversationHistory, config, onChunk);
  }

  // Fallback to mock
  const mockResponse = `Chat response for: ${message}`;
  const words = mockResponse.split(" ");
  for (let i = 0; i < words.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 50));
    onChunk(words[i] + (i < words.length - 1 ? " " : ""));
  }
}

/**
 * Stream chat using OpenAI API
 */
async function chatWithPaperStreamingOpenAI(
  message: string,
  paperContext: { title: string; abstract: string; fullContent?: string },
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  config: LLMConfig,
  onChunk: (chunk: string) => void
): Promise<void> {
  const prompt = createChatPrompt(message, paperContext, conversationHistory);

  try {
    const openai = new OpenAI({
      apiKey: config.apiKey,
    });

    // Build messages array with conversation history and current message
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      {
        role: "system",
        content: "You are a sophisticated research assistant and educational tutor helping researchers understand academic papers deeply. Act as a teacher, providing educational explanations, breaking down complex concepts, and adapting to the user's understanding level.",
      },
      ...conversationHistory.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      {
        role: "user",
        content: prompt,
      },
    ];

    const stream = await openai.chat.completions.create({
      model: config.model || "gpt-4o-2024-08-06",
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2000,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        onChunk(content);
      }
    }
  } catch (error) {
    console.error("Error calling OpenAI API for chat:", error);
    throw error;
  }
}

/**
 * Stream chat using Anthropic API
 */
async function chatWithPaperStreamingAnthropic(
  message: string,
  paperContext: { title: string; abstract: string; fullContent?: string },
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  config: LLMConfig,
  onChunk: (chunk: string) => void
): Promise<void> {
  const prompt = createChatPrompt(message, paperContext, conversationHistory);

  try {
    const client = new Anthropic({
      apiKey: config.apiKey,
    });

    // Build messages array with conversation history and current message
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [
      ...conversationHistory.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      {
        role: "user",
        content: prompt,
      },
    ];

    const stream = await client.messages.stream({
      model: config.model || "claude-sonnet-4-20250514",
      max_tokens: 2000,
      temperature: 0.7,
      messages,
      system: "You are a sophisticated research assistant and educational tutor helping researchers understand academic papers deeply. Act as a teacher, providing educational explanations, breaking down complex concepts, and adapting to the user's understanding level.",
    });

    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
        onChunk(chunk.delta.text);
      }
    }
  } catch (error) {
    console.error("Error calling Anthropic API for chat:", error);
    throw error;
  }
}

/**
 * Generate chat response (for Deep Dive feature)
 * Non-streaming version - kept for backward compatibility if needed
 * @deprecated Use chatWithPaperStreaming for Deep Dive panel
 */
export async function chatWithPaper(
  message: string,
  paperContext: { title: string; abstract: string },
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string> {
  const config = getLLMConfig();
  
  if (config.provider === "mock") {
    return `I understand you're asking about "${message}" in the context of ${paperContext.title}. This is an interesting question that relates to the paper's main contributions.`;
  }
  
  // Real LLM implementation would go here
  return `Chat response for: ${message}`;
}

