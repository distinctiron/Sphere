import type { GlossaryTerm } from "./types";

/** Glossary terms defined in the math path's "From networks to LLMs" module (ids are global; see index.ts) */
export const LLM_TERMS: GlossaryTerm[] = [
  // A10 · Tokens & embeddings
  {
    id: "token",
    term: "Token",
    aliases: ["tokens", "subword"],
    definition:
      "The unit of text a language model reads and writes: a whole word, a piece of a word, a punctuation mark or a byte. In English one token averages about four characters.",
    lesson: "embeddings",
  },
  {
    id: "tokenization",
    term: "Tokenization",
    aliases: ["tokenizer", "tokenisation"],
    definition:
      "Cutting text into tokens from a fixed vocabulary and replacing each with its integer id. It is fixed before training, so the model never sees the characters inside a token.",
    lesson: "embeddings",
  },
  {
    id: "byte-pair-encoding",
    term: "Byte-pair encoding",
    aliases: ["BPE"],
    definition:
      "The usual way to build a subword vocabulary: start from single bytes and repeatedly merge the most frequent adjacent pair in a corpus into a new token until the vocabulary reaches its target size.",
    lesson: "embeddings",
  },
  {
    id: "vocabulary",
    term: "Vocabulary",
    aliases: ["vocab", "vocabulary size"],
    definition:
      "The fixed list of tokens a model can read and write, typically 30,000 to 250,000 entries. Its size sets the number of rows in the embedding table and of scores in each output distribution.",
    lesson: "embeddings",
  },
  {
    id: "embedding",
    term: "Embedding",
    aliases: ["embedding vector", "embedding matrix"],
    definition:
      "A learned vector that represents a token (or, for embedding models, a whole passage). Token embeddings are the rows of a matrix with one row per vocabulary entry; training places tokens used in similar contexts in similar directions.",
    lesson: "embeddings",
  },
  // A11 · Attention
  {
    id: "self-attention",
    term: "Self-attention",
    aliases: ["attention", "attention mechanism"],
    definition:
      "The operation that lets each token update its vector with information from other tokens in the same text: it scores them by query-key alignment, turns the scores into weights with softmax, and adds the weighted mix of their values.",
    lesson: "attention",
  },
  {
    id: "query-key-value",
    term: "Query, key and value",
    aliases: ["QKV", "queries, keys and values"],
    definition:
      "Three learned projections of each token's vector used by attention. The query is what a token looks for, the key is what it advertises, and the value is the content it passes on when attended to.",
    lesson: "attention",
  },
  {
    id: "causal-mask",
    term: "Causal mask",
    aliases: ["causal masking", "causal attention"],
    definition:
      "The rule in decoder models that a token may attend only to itself and earlier tokens. Scores for later tokens are set to minus infinity before softmax, so their weights are zero.",
    lesson: "attention",
  },
  {
    id: "attention-head",
    term: "Attention head",
    aliases: ["head", "heads"],
    definition:
      "One independent attention computation inside a layer, with its own query, key and value projections into a small subspace. Different heads learn to track different relationships between tokens.",
    lesson: "attention",
  },
  {
    id: "multi-head-attention",
    term: "Multi-head attention",
    aliases: ["MHA"],
    definition:
      "Running several attention heads in parallel in one layer and projecting their concatenated outputs back to the model width, so the layer can gather several kinds of information at once.",
    lesson: "attention",
  },
  // A12 · The transformer
  {
    id: "transformer",
    term: "Transformer",
    aliases: ["transformer architecture", "decoder-only transformer"],
    definition:
      "The neural network architecture behind almost all large language models: a stack of blocks, each an attention step followed by an MLP, that read from and add to a running vector for every token.",
    lesson: "transformer",
  },
  {
    id: "residual-stream",
    term: "Residual stream",
    aliases: ["residual connection", "skip connection"],
    definition:
      "The running vector each token carries through a transformer. Every block reads it and adds its output back instead of replacing it, so it acts as a shared workspace and gives gradients a direct path through deep models.",
    lesson: "transformer",
  },
  {
    id: "transformer-block",
    term: "Transformer block",
    aliases: ["layer", "decoder block"],
    definition:
      "One layer of a transformer: a normalised attention step and a normalised MLP step, each added to the residual stream. The classic block holds about 12 × d² weights for model width d.",
    lesson: "transformer",
  },
  {
    id: "layer-norm",
    term: "Layer normalisation",
    aliases: ["layer norm", "LayerNorm", "RMSNorm"],
    definition:
      "Rescaling each token's vector to a standard size (with a learned per-dimension gain) before a block reads it. It keeps values in a stable range as many blocks add to the same stream.",
    lesson: "transformer",
  },
  {
    id: "positional-encoding",
    term: "Positional encoding",
    aliases: ["position embedding", "positional embedding"],
    definition:
      "Information about each token's position added to a transformer, since attention on its own compares only contents and cannot tell word order.",
    lesson: "transformer",
  },
  {
    id: "rope",
    term: "RoPE",
    aliases: ["rotary position embedding", "rotary embeddings"],
    definition:
      "A positional encoding that rotates pairs of query and key coordinates by angles proportional to the token's position, so their dot product depends on the relative offset between tokens rather than absolute positions.",
    lesson: "transformer",
  },
  // A13 · Pretraining & scaling laws
  {
    id: "pretraining",
    term: "Pretraining",
    aliases: ["pre-training"],
    definition:
      "The first and largest phase of training a language model: minimising next-token cross-entropy over trillions of tokens of text, which produces a base model.",
    lesson: "pretraining",
  },
  {
    id: "next-token-prediction",
    term: "Next-token prediction",
    aliases: ["language modelling objective"],
    definition:
      "The pretraining task: given the tokens so far, output a probability distribution over the next one, scored by the surprise (negative log-probability) of the token that actually follows.",
    lesson: "pretraining",
  },
  {
    id: "base-model",
    term: "Base model",
    aliases: ["pretrained model", "foundation model"],
    definition:
      "A model straight out of pretraining. It continues any text plausibly but has not been trained to follow instructions or act as an assistant.",
    lesson: "pretraining",
  },
  {
    id: "scaling-laws",
    term: "Scaling laws",
    aliases: ["scaling law", "neural scaling laws"],
    definition:
      "Empirical power-law relationships between a model's loss and its parameters, training tokens and compute. They let labs forecast the loss of large runs from small ones.",
    lesson: "pretraining",
  },
  {
    id: "compute-optimal",
    term: "Compute-optimal",
    aliases: ["Chinchilla-optimal", "Chinchilla scaling"],
    definition:
      "The split of a fixed training budget (about 6 × parameters × tokens FLOPs) between model size and data that gives the lowest loss: roughly 20 tokens per parameter, per the 2022 Chinchilla study.",
    lesson: "pretraining",
  },
  {
    id: "overtraining",
    term: "Overtraining",
    aliases: ["overtrained"],
    definition:
      "Training a model on many more tokens per parameter than is compute-optimal, accepting a higher training bill to get a smaller model that is cheaper to serve at a given quality.",
    lesson: "pretraining",
  },
  // A14 · Sampling & generation
  {
    id: "autoregressive",
    term: "Autoregressive generation",
    aliases: ["autoregressive", "autoregression"],
    definition:
      "Producing a sequence one token at a time, where each chosen token is appended to the input before the next is predicted. Token t + 1 cannot be computed until token t exists.",
    lesson: "sampling",
  },
  {
    id: "unembedding",
    term: "Unembedding",
    aliases: ["output layer", "LM head"],
    definition:
      "The final layer of a language model: it takes the dot product of the last vector with an output vector for every vocabulary token, giving one logit per token. It is often the embedding table reused.",
    lesson: "sampling",
  },
  {
    id: "greedy-decoding",
    term: "Greedy decoding",
    aliases: ["greedy", "argmax decoding"],
    definition:
      "Always choosing the single most likely next token. It is deterministic but tends toward bland and repetitive text over long outputs.",
    lesson: "sampling",
  },
  {
    id: "top-k-sampling",
    term: "Top-k sampling",
    aliases: ["top-k"],
    definition: "Sampling only from the k most likely next tokens, after rescaling their probabilities to sum to 1.",
    lesson: "sampling",
  },
  {
    id: "top-p-sampling",
    term: "Top-p sampling",
    aliases: ["nucleus sampling", "top-p"],
    definition:
      "Sampling only from the smallest set of most likely tokens whose probabilities add up to at least p, after rescaling. The set shrinks when the model is confident and grows when it is not.",
    lesson: "sampling",
  },
  {
    id: "stop-token",
    term: "Stop token",
    aliases: ["end-of-sequence token", "EOS token", "end-of-turn token"],
    definition:
      "A special vocabulary entry that marks the end of a text or of a chat turn. When the model samples it, the generation loop ends.",
    lesson: "sampling",
  },
  // A15 · Post-training & reasoning models
  {
    id: "post-training",
    term: "Post-training",
    aliases: ["posttraining", "alignment training"],
    definition:
      "The training phases after pretraining (supervised fine-tuning, preference learning, reinforcement learning) that turn a base model into an assistant. They reshape which behaviours the model produces far more than they add knowledge.",
    lesson: "post-training",
  },
  {
    id: "supervised-fine-tuning",
    term: "Supervised fine-tuning",
    aliases: ["SFT", "instruction tuning"],
    definition:
      "Continuing training with the next-token loss on curated example conversations, scoring only the response tokens, so the model learns to answer in the assistant format.",
    lesson: "post-training",
  },
  {
    id: "reward-model",
    term: "Reward model",
    aliases: ["preference model", "RM"],
    definition:
      "A model trained on human (or AI) comparisons to give a single score to a response, higher for the kind of response raters prefer. It stands in for the raters during reinforcement learning.",
    lesson: "post-training",
  },
  {
    id: "rlhf",
    term: "RLHF",
    aliases: ["reinforcement learning from human feedback"],
    definition:
      "Post-training that samples responses, scores them with a reward model trained on human preferences, and pushes the model toward high scores while a KL penalty keeps it close to where it started.",
    lesson: "post-training",
  },
  {
    id: "dpo",
    term: "DPO",
    aliases: ["direct preference optimisation", "direct preference optimization"],
    definition:
      "A preference-learning method that adjusts the model directly on pairs of preferred and rejected responses, reaching the same kind of solution as RLHF without a separate reward model or sampling loop.",
    lesson: "post-training",
  },
  {
    id: "constitutional-ai",
    term: "Constitutional AI",
    aliases: ["RLAIF", "AI feedback"],
    definition:
      "Preference training in which most judgements come from an AI model guided by a written list of principles (a constitution) rather than from human raters.",
    lesson: "post-training",
  },
  {
    id: "rlvr",
    term: "RL with verifiable rewards",
    aliases: ["RLVR", "verifiable rewards"],
    definition:
      "Reinforcement learning on tasks whose answers can be checked automatically, such as maths with known answers or code with tests: successful attempts are reinforced, with no learned reward model in between.",
    lesson: "post-training",
  },
  {
    id: "reasoning-model",
    term: "Reasoning model",
    aliases: ["thinking model", "chain of thought", "thinking tokens"],
    definition:
      "A model trained, mostly with verifiable rewards, to write out long reasoning before its answer. The written steps become context for later tokens, adding serial computation beyond a single forward pass.",
    lesson: "post-training",
  },
  {
    id: "test-time-compute",
    term: "Test-time compute",
    aliases: ["inference-time compute", "thinking budget", "reasoning effort"],
    definition:
      "Computation spent while answering rather than during training, mainly by generating more reasoning tokens. For reasoning models, accuracy on hard problems rises with it, as does cost.",
    lesson: "post-training",
  },
  {
    id: "reward-hacking",
    term: "Reward hacking",
    aliases: ["reward over-optimisation", "specification gaming"],
    definition:
      "When optimisation raises the measured reward by exploiting flaws in the reward model or checker instead of doing what was intended, so the score improves while true quality falls.",
    lesson: "post-training",
  },
  {
    id: "sycophancy",
    term: "Sycophancy",
    aliases: ["sycophantic"],
    definition:
      "A model's tendency to agree with and flatter the user, even when the user is wrong. It arises when preference training amplifies raters' slight preference for agreeable answers.",
    lesson: "post-training",
  },
];
