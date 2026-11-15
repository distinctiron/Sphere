/**
 * LLM Service Abstraction
 * 
 * Provides a consistent interface for LLM API calls (novelty scoring, explanations, chat)
 * Supports multiple providers (OpenAI, Anthropic, etc.) via environment configuration
 */

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
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

/** Default model when LLM_PROVIDER=anthropic and LLM_MODEL is unset */
export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5-5";

/**
 * Request options shared by every Anthropic call.
 *
 * Claude Sonnet 5.5 thinks adaptively and rejects `temperature`, so tone and
 * length are steered by the prompts. Effort `low` suits chat, explanations and
 * extraction (it skips thinking on most simple requests); thinking tokens count
 * towards `max_tokens`, so the limits leave headroom above the expected reply.
 */
function anthropicOptions(maxTokens: number) {
  return {
    max_tokens: maxTokens,
    thinking: { type: "adaptive" as const },
    output_config: { effort: "low" as const },
  };
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
    model: process.env.LLM_MODEL || (provider === "openai" ? "gpt-4o-2024-08-06" : provider === "anthropic" ? DEFAULT_ANTHROPIC_MODEL : undefined),
  };
}

/**
 * Whether a real LLM provider is configured (false in mock mode).
 * Background jobs use this to avoid persisting placeholder mock scores.
 */
export function isLLMConfigured(): boolean {
  const provider = process.env.LLM_PROVIDER;
  return (provider === "openai" || provider === "anthropic") && !!process.env.LLM_API_KEY;
}

// ---------------------------------------------------------------------------
// Usage reporting (for billing, lib/billing)
// ---------------------------------------------------------------------------

/** Token usage of one model call. inputTokens excludes cached and cache-write tokens. */
export interface LLMUsage {
  provider: "openai" | "anthropic" | "mock";
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  cacheWriteTokens: number;
}

/** Called once per model call with its usage */
export type UsageCallback = (usage: LLMUsage) => void;

type OpenAIChatUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  prompt_tokens_details?: { cached_tokens?: number } | null;
} | null | undefined;

function openAIChatUsage(model: string, usage: OpenAIChatUsage): LLMUsage | undefined {
  if (!usage) return undefined;
  const cached = usage.prompt_tokens_details?.cached_tokens ?? 0;
  return {
    provider: "openai",
    model,
    inputTokens: usage.prompt_tokens - cached,
    outputTokens: usage.completion_tokens,
    cachedInputTokens: cached,
    cacheWriteTokens: 0,
  };
}

type OpenAIResponsesUsage = {
  input_tokens: number;
  output_tokens: number;
  input_tokens_details?: { cached_tokens?: number } | null;
} | null | undefined;

function openAIResponsesUsage(model: string, usage: OpenAIResponsesUsage): LLMUsage | undefined {
  if (!usage) return undefined;
  const cached = usage.input_tokens_details?.cached_tokens ?? 0;
  return {
    provider: "openai",
    model,
    inputTokens: usage.input_tokens - cached,
    outputTokens: usage.output_tokens,
    cachedInputTokens: cached,
    cacheWriteTokens: 0,
  };
}

type AnthropicUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

function anthropicUsage(model: string, usage: AnthropicUsage): LLMUsage {
  return {
    provider: "anthropic",
    model,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cachedInputTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
  };
}

/**
 * Report usage for a finished Anthropic stream. A safeguard decline arrives as a
 * normal response with stop_reason "refusal"; it is billed like any call, then
 * raised so the route's error message is shown instead of an empty answer.
 */
async function finishAnthropicStream(
  stream: { finalMessage(): Promise<Anthropic.Message> },
  model: string,
  onUsage?: UsageCallback
): Promise<void> {
  const final = await stream.finalMessage();
  onUsage?.(anthropicUsage(model, final.usage));
  if (final.stop_reason === "refusal") throw new Error("The model declined this request");
}

/** Mock mode estimates tokens at ~4 characters each, so billing can be exercised without an API key */
function mockUsage(prompt: string, output: string): LLMUsage {
  return {
    provider: "mock",
    model: "mock",
    inputTokens: Math.ceil(prompt.length / 4),
    outputTokens: Math.ceil(output.length / 4),
    cachedInputTokens: 0,
    cacheWriteTokens: 0,
  };
}

/** GPT-5 and o-series reasoning models reject `max_tokens` and non-default temperatures */
function openAIChatOptions(model: string, maxTokens: number, temperature: number) {
  const reasoningModel = /^(gpt-5|o\d)/.test(model);
  return {
    max_completion_tokens: maxTokens,
    ...(reasoningModel ? {} : { temperature }),
    stream_options: { include_usage: true },
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
  categories: string[],
  onUsage?: UsageCallback
): Promise<NoveltyScoreResponse> {
  const config = getLLMConfig();

  // Mock implementation for development/testing (when no API key provided)
  if (config.provider === "mock" || !config.apiKey) {
    console.warn("Using mock novelty scoring. Set LLM_PROVIDER and LLM_API_KEY to use real LLM scoring.");
    const result = mockNoveltyScoring(title, abstract, authors, categories);
    onUsage?.(mockUsage(createNoveltyScoringPrompt(title, abstract, authors, categories), result.summary));
    return result;
  }

  // Real LLM implementation
  if (config.provider === "openai") {
    return scoreNoveltyWithOpenAI(title, abstract, authors, categories, config, onUsage);
  }

  if (config.provider === "anthropic") {
    return scoreNoveltyWithAnthropic(title, abstract, authors, categories, config, onUsage);
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
  config: LLMConfig,
  onUsage?: UsageCallback
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

    const usage = openAIResponsesUsage(config.model!, response.usage);
    if (usage) onUsage?.(usage);
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
  config: LLMConfig,
  onUsage?: UsageCallback
): Promise<NoveltyScoreResponse> {
  const prompt = createNoveltyScoringPrompt(title, abstract, authors, categories);

  try {
    const client = new Anthropic({
      apiKey: config.apiKey,
    });

    const options = anthropicOptions(2048);
    const response = await client.messages.parse({
      model: config.model!,
      max_tokens: options.max_tokens,
      thinking: options.thinking,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      system: "You are a research assistant specializing in evaluating academic papers.",
      output_config: { ...options.output_config, format: zodOutputFormat(NoveltyScoreSchema) },
    });

    onUsage?.(anthropicUsage(config.model!, response.usage));
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
export interface ExplanationContext {
  title: string;
  abstract: string;
  /** Numbered passages retrieved from the paper (RAG); cited as [n] */
  sources?: string;
  /** The paragraph the selection was made in */
  surroundingText?: string;
}

export async function explainTextStreaming(
  text: string,
  paperContext: ExplanationContext,
  onChunk: (chunk: string) => void,
  onUsage?: UsageCallback
): Promise<void> {
  const config = getLLMConfig();
  
  // Mock implementation for development/testing
  if (config.provider === "mock" || !config.apiKey) {
    const mockExplanation = `This term refers to "${text}" in the context of ${paperContext.title}. It's a key concept in the paper's methodology.${paperContext.sources ? " The paper discusses it in the retrieved passage [1]." : ""}`;
    // Simulate streaming by sending chunks
    const words = mockExplanation.split(" ");
    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      onChunk(words[i] + (i < words.length - 1 ? " " : ""));
    }
    onUsage?.(mockUsage(createExplanationPrompt(text, paperContext), mockExplanation));
    return;
  }

  // Real LLM implementation
  if (config.provider === "openai") {
    return explainTextStreamingOpenAI(text, paperContext, config, onChunk, onUsage);
  }

  if (config.provider === "anthropic") {
    return explainTextStreamingAnthropic(text, paperContext, config, onChunk, onUsage);
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
function createExplanationPrompt(text: string, paperContext: ExplanationContext): string {
  const surrounding = paperContext.surroundingText
    ? `\n\n**Paragraph containing the selection:**\n${paperContext.surroundingText.substring(0, 1500)}`
    : "";
  const sources = paperContext.sources
    ? `\n\n**Relevant passages from the paper (numbered sources):**\n${paperContext.sources}`
    : "";
  const citationInstruction = paperContext.sources
    ? "\n- Ground the explanation in the numbered passages and cite them inline like [1] or [2]; only cite a passage you actually used"
    : "";

  return `You are a helpful research assistant. Explain the following term or phrase from an academic paper in clear, accessible language.

**Paper Context:**
Title: ${paperContext.title}
Abstract: ${paperContext.abstract.substring(0, 500)}${paperContext.abstract.length > 500 ? "..." : ""}${surrounding}${sources}

**Term/Phrase to Explain:**
${text}

**Instructions:**
- Provide a simple, clear explanation (2-4 sentences)
- Use plain language, avoid jargon when possible
- If helpful, provide an analogy or real-world comparison
- Reference how it's used in this specific paper's context${citationInstruction}
- Write in a conversational, educational tone`;
}

/**
 * Stream explanation using OpenAI API
 */
async function explainTextStreamingOpenAI(
  text: string,
  paperContext: ExplanationContext,
  config: LLMConfig,
  onChunk: (chunk: string) => void,
  onUsage?: UsageCallback
): Promise<void> {
  const prompt = createExplanationPrompt(text, paperContext);

  try {
    const openai = new OpenAI({
      apiKey: config.apiKey,
    });

    const model = config.model || "gpt-4o-2024-08-06";
    const stream = await openai.chat.completions.create({
      model,
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
      ...openAIChatOptions(model, 400, 0.7),
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        onChunk(content);
      }
      const usage = openAIChatUsage(model, chunk.usage);
      if (usage) onUsage?.(usage);
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
  paperContext: ExplanationContext,
  config: LLMConfig,
  onChunk: (chunk: string) => void,
  onUsage?: UsageCallback
): Promise<void> {
  const prompt = createExplanationPrompt(text, paperContext);

  try {
    const client = new Anthropic({
      apiKey: config.apiKey,
    });

    const model = config.model || DEFAULT_ANTHROPIC_MODEL;
    const stream = await client.messages.stream({
      model,
      ...anthropicOptions(1500),
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
    await finishAnthropicStream(stream, model, onUsage);
  } catch (error) {
    console.error("Error calling Anthropic API for explanation:", error);
    throw error;
  }
}

/**
 * Create the prompt for chat with paper
 * Includes full paper context, conversation history, and educational teaching style
 */
export interface ChatPaperContext {
  title: string;
  abstract: string;
  /** Full paper text; only used when no retrieved sources are available */
  fullContent?: string;
  /** Numbered passages retrieved for this question (RAG); cited as [n] */
  sources?: string;
}

function createChatPrompt(
  message: string,
  paperContext: ChatPaperContext,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>
): string {
  const paperContent = paperContext.sources
    ? `\n\n**Abstract:**\n${paperContext.abstract}\n\n**Passages retrieved from the paper for this question (numbered sources):**\n${paperContext.sources}`
    : paperContext.fullContent
      ? `\n\n**Full Paper Content:**\n${paperContext.fullContent.substring(0, 100000)}${paperContext.fullContent.length > 100000 ? "\n[... content truncated for length ...]" : ""}`
      : `\n\n**Abstract:**\n${paperContext.abstract}`;
  const citationInstructions = paperContext.sources
    ? `- Base your answer on the numbered passages and cite them inline like [1] or [2][3] right after the claims they support
- Only cite a passage you actually used; never invent source numbers
- If the passages don't contain the answer, say so, then answer from general knowledge and make clear which parts are not from the paper`
    : `- Provide detailed, cited responses referencing specific sections (e.g., "Section 3.2", "Figure 1", "Equation 5")
- Include visual citations (section numbers, page references) in your responses`;

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
${citationInstructions}
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
  paperContext: ChatPaperContext,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  onChunk: (chunk: string) => void,
  onUsage?: UsageCallback
): Promise<void> {
  const config = getLLMConfig();
  
  // Mock implementation for development/testing
  if (config.provider === "mock" || !config.apiKey) {
    const mockResponse = `I understand you're asking about "${message}" in the context of ${paperContext.title}. This is an interesting question that relates to the paper's main contributions${paperContext.sources ? " [1]" : ""}. Let me explore this further based on the paper's content.`;
    // Simulate streaming by sending chunks
    const words = mockResponse.split(" ");
    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      onChunk(words[i] + (i < words.length - 1 ? " " : ""));
    }
    const historyText = conversationHistory.map((m) => m.content).join("\n");
    onUsage?.(mockUsage(historyText + createChatPrompt(message, paperContext, conversationHistory), mockResponse));
    return;
  }

  // Real LLM implementation
  if (config.provider === "openai") {
    return chatWithPaperStreamingOpenAI(message, paperContext, conversationHistory, config, onChunk, onUsage);
  }

  if (config.provider === "anthropic") {
    return chatWithPaperStreamingAnthropic(message, paperContext, conversationHistory, config, onChunk, onUsage);
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
  paperContext: ChatPaperContext,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  config: LLMConfig,
  onChunk: (chunk: string) => void,
  onUsage?: UsageCallback
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

    const model = config.model || "gpt-4o-2024-08-06";
    const stream = await openai.chat.completions.create({
      model,
      messages,
      stream: true,
      ...openAIChatOptions(model, 2000, 0.7),
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        onChunk(content);
      }
      const usage = openAIChatUsage(model, chunk.usage);
      if (usage) onUsage?.(usage);
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
  paperContext: ChatPaperContext,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  config: LLMConfig,
  onChunk: (chunk: string) => void,
  onUsage?: UsageCallback
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

    const model = config.model || DEFAULT_ANTHROPIC_MODEL;
    const stream = await client.messages.stream({
      model,
      ...anthropicOptions(4000),
      messages,
      system: "You are a sophisticated research assistant and educational tutor helping researchers understand academic papers deeply. Act as a teacher, providing educational explanations, breaking down complex concepts, and adapting to the user's understanding level.",
    });

    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
        onChunk(chunk.delta.text);
      }
    }
    await finishAnthropicStream(stream, model, onUsage);
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


// ---------------------------------------------------------------------------
// Breaking news (Epic 8)
// ---------------------------------------------------------------------------

/** Model used for generated content (recorded with cached story articles) */
export function getLLMModelName(): string {
  const config = getLLMConfig();
  return config.provider === "mock" ? "mock" : `${config.provider}:${config.model}`;
}

const StorySummarySchema = z.object({
  headline: z.string(),
  summary: z.string(),
  whyItMatters: z.string(),
});

export type StorySummary = z.infer<typeof StorySummarySchema>;

export interface StorySummaryItem {
  platform: string;
  sourceName: string;
  title: string;
  snippet?: string | null;
  engagement: number;
  comments: number;
  publishedAt: Date;
}

const NEWS_SYSTEM_PROMPT =
  "You are a sharp, neutral technology news editor covering artificial intelligence. You write accurately, attribute claims to their sources, separate facts from speculation, and never invent details that the sources don't support.";

function createStorySummaryPrompt(items: StorySummaryItem[]): string {
  const list = items
    .map(
      (item, i) =>
        `${i + 1}. [${item.platform} · ${item.sourceName} · ${item.publishedAt.toISOString().slice(0, 16).replace("T", " ")} UTC` +
        `${item.engagement > 0 ? ` · ${item.engagement} points/upvotes/stars` : ""}${item.comments > 0 ? ` · ${item.comments} comments` : ""}]\n` +
        `   ${item.title}${item.snippet ? `\n   ${item.snippet.slice(0, 300)}` : ""}`
    )
    .join("\n");

  return `These posts and articles from different platforms were grouped together as one AI news story:

${list}

Write:
- headline: a clear, factual news headline for the story (max 90 characters, no clickbait, no trailing period)
- summary: 2-3 sentences on what happened, based only on the items above
- whyItMatters: one sentence on why this matters for people following AI

If the items turn out not to be about a single event, describe the common thread.`;
}

/** Headline + summary for a clustered story (structured output) */
export async function summarizeStory(items: StorySummaryItem[], onUsage?: UsageCallback): Promise<StorySummary> {
  const config = getLLMConfig();
  if (config.provider === "mock" || !config.apiKey) {
    return {
      headline: items[0]?.title ?? "Untitled story",
      summary: "Mock summary: configure LLM_PROVIDER and LLM_API_KEY to generate story summaries.",
      whyItMatters: "",
    };
  }

  const prompt = createStorySummaryPrompt(items);
  let parsed: StorySummary | null | undefined;
  if (config.provider === "openai") {
    const response = await new OpenAI({ apiKey: config.apiKey }).responses.parse({
      model: config.model!,
      input: [
        { role: "system", content: NEWS_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      text: { format: zodTextFormat(StorySummarySchema, "story_summary") },
    });
    const usage = openAIResponsesUsage(config.model!, response.usage);
    if (usage) onUsage?.(usage);
    parsed = response.output_parsed;
  } else {
    const options = anthropicOptions(2048);
    const response = await new Anthropic({ apiKey: config.apiKey }).messages.parse({
      model: config.model!,
      max_tokens: options.max_tokens,
      thinking: options.thinking,
      system: NEWS_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
      output_config: { ...options.output_config, format: zodOutputFormat(StorySummarySchema) },
    });
    onUsage?.(anthropicUsage(config.model!, response.usage));
    parsed = response.parsed_output;
  }
  if (!parsed) throw new Error("No parsed output for story summary");

  const validated = StorySummarySchema.parse(parsed);
  return {
    headline: validated.headline.trim().replace(/\.$/, "").slice(0, 160),
    summary: validated.summary.trim(),
    whyItMatters: validated.whyItMatters.trim(),
  };
}

export interface StoryArticleContext {
  headline: string;
  summary?: string | null;
  /** Numbered source blocks; cited as [n] */
  sources: string;
  /** Related earlier stories and papers already in Sphere, for the bigger picture */
  related?: string;
  now: Date;
}

export const STORY_ARTICLE_SECTIONS = ["What's happening", "Source breakdown", "The bigger picture"] as const;

function createStoryArticlePrompt(context: StoryArticleContext): string {
  const related = context.related ? `\n\n**Related coverage already in the reader's feed (for context only, do not cite):**\n${context.related}` : "";
  return `Today is ${context.now.toISOString().slice(0, 10)}. Write a short news article about this developing AI story for a reader who wants to stay on top of the field.

**Working headline:** ${context.headline}${context.summary ? `\n**Summary so far:** ${context.summary}` : ""}

**Numbered sources (posts, articles, repos and discussions from different platforms):**
${context.sources}${related}

Write in Markdown with exactly these three sections:

## ${STORY_ARTICLE_SECTIONS[0]}
3-5 short paragraphs: what happened, who is involved, what was announced or released, and the timeline. Lead with the most important fact.

## ${STORY_ARTICLE_SECTIONS[1]}
One bullet per platform or outlet, starting with its name in bold (e.g. "- **Hacker News:** ..."). Say what that source reports or emphasises; for community discussions (Hacker News, Reddit, X) describe the reaction and sentiment, notable claims, and skepticism. Point out where sources agree or disagree.

## ${STORY_ARTICLE_SECTIONS[2]}
2-3 paragraphs interpreting what this means for the AI landscape: the trend it fits into, competitors and the wider ecosystem, implications for researchers and builders, and what to watch next. Clearly flag anything unconfirmed or speculative.

Rules:
- Cite sources inline with their numbers, like [1] or [2, 3], after the claims they support. Only cite sources you actually used.
- Use only facts from the sources; for the interpretation you may use general knowledge of the AI field but label opinions as analysis.
- Don't add a title, preamble or closing remarks outside the three sections.`;
}

async function streamWords(text: string, onChunk: (chunk: string) => void, delayMs = 15): Promise<void> {
  const words = text.split(" ");
  for (let i = 0; i < words.length; i++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    onChunk(words[i] + (i < words.length - 1 ? " " : ""));
  }
}

/** Streams the Markdown story article (What's happening / Source breakdown / The bigger picture) */
export async function generateStoryArticleStreaming(
  context: StoryArticleContext,
  onChunk: (chunk: string) => void,
  onUsage?: UsageCallback
): Promise<void> {
  const config = getLLMConfig();
  const prompt = createStoryArticlePrompt(context);

  if (config.provider === "mock" || !config.apiKey) {
    const article =
      `## ${STORY_ARTICLE_SECTIONS[0]}\n\n${context.summary || context.headline} [1]\n\n` +
      `## ${STORY_ARTICLE_SECTIONS[1]}\n\n- **Mock mode:** configure LLM_PROVIDER and LLM_API_KEY to generate a full article with a per-source breakdown.\n\n` +
      `## ${STORY_ARTICLE_SECTIONS[2]}\n\nAnalysis is unavailable in mock mode; see the sources listed alongside this article.`;
    await streamWords(article, onChunk);
    onUsage?.(mockUsage(prompt, article));
    return;
  }

  if (config.provider === "openai") {
    const model = config.model || "gpt-4o-2024-08-06";
    const stream = await new OpenAI({ apiKey: config.apiKey }).chat.completions.create({
      model,
      messages: [
        { role: "system", content: NEWS_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      stream: true,
      ...openAIChatOptions(model, 2000, 0.4),
    });
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) onChunk(content);
      const usage = openAIChatUsage(model, chunk.usage);
      if (usage) onUsage?.(usage);
    }
    return;
  }

  const model = config.model || DEFAULT_ANTHROPIC_MODEL;
  const stream = await new Anthropic({ apiKey: config.apiKey }).messages.stream({
    model,
    ...anthropicOptions(4000),
    system: NEWS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });
  for await (const chunk of stream) {
    if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") onChunk(chunk.delta.text);
  }
  await finishAnthropicStream(stream, model, onUsage);
}

// ---------------------------------------------------------------------------
// Learn tab tutor (Epic 9)
// ---------------------------------------------------------------------------

export type TutorTurn = { role: "user" | "assistant"; content: string };

/**
 * Streams a tutor answer. `system` carries the lesson context and teaching rules
 * (built by lib/learn/tutor.ts); history holds earlier turns of the conversation.
 */
export async function tutorChatStreaming(
  system: string,
  history: TutorTurn[],
  message: string,
  onChunk: (chunk: string) => void,
  onUsage?: UsageCallback
): Promise<void> {
  const config = getLLMConfig();

  if (config.provider === "mock" || !config.apiKey) {
    const answer = `**Mock tutor:** you asked "${message}". With LLM_PROVIDER and LLM_API_KEY configured, I would answer using this lesson's mental picture and point you to the lessons it builds on.`;
    await streamWords(answer, onChunk);
    onUsage?.(mockUsage(system + history.map((t) => t.content).join("\n") + message, answer));
    return;
  }

  const messages = [...history, { role: "user" as const, content: message }];

  if (config.provider === "openai") {
    const model = config.model || "gpt-4o-2024-08-06";
    const stream = await new OpenAI({ apiKey: config.apiKey }).chat.completions.create({
      model,
      messages: [{ role: "system", content: system }, ...messages],
      stream: true,
      ...openAIChatOptions(model, 1500, 0.5),
    });
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) onChunk(content);
      const usage = openAIChatUsage(model, chunk.usage);
      if (usage) onUsage?.(usage);
    }
    return;
  }

  const model = config.model || DEFAULT_ANTHROPIC_MODEL;
  const stream = await new Anthropic({ apiKey: config.apiKey }).messages.stream({
    model,
    ...anthropicOptions(3000),
    system,
    messages,
  });
  for await (const chunk of stream) {
    if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") onChunk(chunk.delta.text);
  }
  await finishAnthropicStream(stream, model, onUsage);
}
