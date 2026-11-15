/**
 * News topic configuration (Epic 8)
 *
 * v1 ships a single "ai" topic. Every source reads its queries, subreddits,
 * feeds and accounts from a TopicConfig, so more topics can be added by
 * defining another config.
 */

export interface FeedConfig {
  name: string;
  url: string;
  /** General-interest feeds are filtered by the topic keywords */
  filterByKeywords: boolean;
}

export interface TopicConfig {
  id: string;
  label: string;
  /** Case-insensitive whole-word patterns; used to filter general feeds and HN */
  keywords: string[];
  hackerNews: { queries: string[]; minPoints: number };
  reddit: { subreddits: string[]; perSubreddit: number };
  github: {
    /** Repository topics searched for new, fast-rising repos */
    searchTopics: string[];
    minStars: number;
    /** owner/repo whose releases are tracked */
    watchedRepos: string[];
  };
  feeds: FeedConfig[];
  x: { accounts: string[] };
}

export const AI_TOPIC: TopicConfig = {
  id: "ai",
  label: "AI",
  keywords: [
    "AI",
    "A\\.I\\.",
    "artificial intelligence",
    "machine learning",
    "deep learning",
    "neural net(work)?s?",
    "LLMs?",
    "large language models?",
    "language models?",
    "foundation models?",
    "generative AI",
    "GenAI",
    "chatbots?",
    "AGI",
    "superintelligence",
    "AI agents?",
    "agentic",
    "OpenAI",
    "ChatGPT",
    "GPT-?\\d[\\w.-]*",
    "Sora",
    "Anthropic",
    "Claude",
    "Gemini",
    "DeepMind",
    "Google AI",
    "Meta AI",
    "Llama",
    "Mistral",
    "DeepSeek",
    "Qwen",
    "xAI",
    "Grok",
    "Hugging ?Face",
    "Nvidia",
    "Copilot",
    "Perplexity",
    "Cursor",
    "transformers?",
    "diffusion models?",
    "RAG",
    "fine-?tun(e|ing)",
    "inference",
    "GPUs?",
    "reasoning models?",
    "multimodal",
  ],
  hackerNews: {
    queries: [
      "AI",
      "LLM",
      "OpenAI",
      "Anthropic",
      "Claude",
      "GPT",
      "Gemini",
      "DeepSeek",
      "Llama",
      "Mistral",
      "machine learning",
      "AI agents",
    ],
    minPoints: 20,
  },
  reddit: {
    subreddits: ["MachineLearning", "LocalLLaMA", "artificial", "OpenAI", "ClaudeAI", "singularity"],
    perSubreddit: 15,
  },
  github: {
    searchTopics: ["llm", "ai-agents", "large-language-models", "generative-ai"],
    minStars: 100,
    watchedRepos: [
      "ollama/ollama",
      "vllm-project/vllm",
      "ggml-org/llama.cpp",
      "huggingface/transformers",
      "openai/openai-python",
      "anthropics/anthropic-sdk-python",
      "langchain-ai/langchain",
      "pytorch/pytorch",
    ],
  },
  feeds: [
    { name: "TechCrunch", url: "https://techcrunch.com/category/artificial-intelligence/feed/", filterByKeywords: false },
    { name: "The Verge", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", filterByKeywords: false },
    { name: "VentureBeat", url: "https://venturebeat.com/category/ai/feed/", filterByKeywords: false },
    {
      name: "MIT Technology Review",
      url: "https://www.technologyreview.com/topic/artificial-intelligence/feed",
      filterByKeywords: false,
    },
    { name: "Ars Technica", url: "https://arstechnica.com/ai/feed/", filterByKeywords: false },
    { name: "Hugging Face", url: "https://huggingface.co/blog/feed.xml", filterByKeywords: false },
    { name: "Google DeepMind", url: "https://deepmind.google/blog/rss.xml", filterByKeywords: false },
    { name: "OpenAI", url: "https://openai.com/news/rss.xml", filterByKeywords: false },
    {
      // Aggregates coverage from many outlets; titles end with " - <Outlet>".
      // Google permits this feed for personal, non-commercial use only; disable
      // it with DISABLED_NEWS_FEEDS="Google News" for other deployments.
      name: "Google News",
      url: "https://news.google.com/rss/search?q=%22artificial+intelligence%22+OR+OpenAI+OR+Anthropic+OR+%22AI+model%22+when:1d&hl=en-US&gl=US&ceid=US:en",
      filterByKeywords: true,
    },
  ],
  x: {
    accounts: [
      "OpenAI",
      "AnthropicAI",
      "GoogleDeepMind",
      "AIatMeta",
      "MistralAI",
      "deepseek_ai",
      "xai",
      "huggingface",
      "sama",
      "karpathy",
      "ylecun",
      "demishassabis",
    ],
  },
};

export const TOPICS: Record<string, TopicConfig> = { [AI_TOPIC.id]: AI_TOPIC };

export const DEFAULT_TOPIC = AI_TOPIC.id;

export function getTopic(id: string = DEFAULT_TOPIC): TopicConfig {
  const topic = TOPICS[id];
  if (!topic) throw new Error(`Unknown news topic: ${id}`);
  return topic;
}

const CASE_SENSITIVE_KEYWORDS = new Set(["AI", "RAG", "xAI"]);

/** Builds a matcher for a topic's keywords (whole words, case-insensitive) */
export function createKeywordMatcher(keywords: string[]): (text: string) => boolean {
  // "AI" is matched case-sensitively so "said"/"air" never match; everything else is case-insensitive
  const caseSensitive = keywords.filter((k) => CASE_SENSITIVE_KEYWORDS.has(k));
  const insensitive = keywords.filter((k) => !caseSensitive.includes(k));
  const sensitivePattern = caseSensitive.length ? new RegExp(`(^|[^A-Za-z0-9])(${caseSensitive.join("|")})(?![A-Za-z0-9])`) : null;
  const insensitivePattern = insensitive.length
    ? new RegExp(`(^|[^A-Za-z0-9])(${insensitive.join("|")})(?![A-Za-z0-9])`, "i")
    : null;
  return (text: string) => !!(sensitivePattern?.test(text) || insensitivePattern?.test(text));
}
