import type { GlossaryTerm } from "./types";

/** Glossary terms defined in the economy path (ids are global; see index.ts) */
export const ECONOMY_TERMS: GlossaryTerm[] = [
  // D1 value-chain
  {
    id: "binding-constraint",
    term: "Binding constraint",
    aliases: ["bottleneck", "scarcest link"],
    definition: "The input in a chain whose limited capacity caps total output. Adding capacity anywhere else adds slack, not output, until this link is relieved and another one binds.",
    lesson: "value-chain",
  },
  {
    id: "chokepoint",
    term: "Chokepoint",
    definition: "A link in a supply chain with one or very few suppliers that others cannot quickly replace or route around. Its owner can charge a lasting premium, and states can use it as leverage.",
    lesson: "value-chain",
  },
  {
    id: "economic-rent",
    term: "Economic rent",
    aliases: ["rent"],
    definition: "Profit above what would be needed to keep a supplier in business, earned because its input is scarce and cannot be replaced. A shortage creates a temporary premium; a chokepoint turns it into a lasting rent.",
    lesson: "value-chain",
  },
  {
    id: "gross-margin",
    term: "Gross margin",
    definition: "Revenue minus the direct cost of the goods or services sold, as a share of revenue. A first indicator of pricing power, before research, sales and overhead costs.",
    lesson: "value-chain",
  },
  {
    id: "foundry",
    term: "Foundry",
    aliases: ["contract chipmaker"],
    definition: "A company that manufactures chips designed by other companies, such as TSMC. It sells manufacturing capacity rather than chips of its own design.",
    lesson: "value-chain",
  },
  {
    id: "custom-silicon",
    term: "Custom silicon",
    aliases: ["ASIC", "in-house chip"],
    definition: "Chips designed by or for one large buyer for its own workloads, such as Google's TPU or Amazon's Trainium, usually with a design partner and made by a foundry.",
    lesson: "value-chain",
  },
  {
    id: "odm",
    term: "ODM",
    aliases: ["original design manufacturer", "contract manufacturer"],
    definition: "A contract manufacturer that designs and assembles hardware such as servers and racks for other companies to sell or use, for example Foxconn or Quanta.",
    lesson: "value-chain",
  },
  {
    id: "hyperscaler",
    term: "Hyperscaler",
    definition: "One of the few companies that run cloud and data-center infrastructure at the largest scale, such as Amazon, Microsoft, Google, and for its own use Meta. They are the largest buyers of AI chips.",
    lesson: "value-chain",
  },
  {
    id: "neocloud",
    term: "Neocloud",
    definition: "A newer cloud provider focused on renting GPU capacity for AI, such as CoreWeave or Nebius, often financed with debt secured on long customer contracts and the GPUs themselves.",
    lesson: "value-chain",
  },

  // D2 semiconductors
  {
    id: "euv-lithography",
    term: "EUV lithography",
    aliases: ["extreme ultraviolet lithography", "EUV"],
    definition: "Chip patterning with 13.5 nm extreme-ultraviolet light, needed for the most advanced chips at practical cost. Only ASML makes the machines.",
    lesson: "semiconductors",
  },
  {
    id: "process-node",
    term: "Process node",
    aliases: ["node", "3 nm", "2 nm"],
    definition: "A generation of chip manufacturing technology, labelled with names like 3 nm or 2 nm that no longer match any physical dimension. Each new node packs more transistors into the same area.",
    lesson: "semiconductors",
  },
  {
    id: "die-yield",
    term: "Yield",
    aliases: ["die yield"],
    definition: "The share of chips (dies) on a wafer that work. It falls roughly exponentially with die area times defect density, and rises as a fab learns to remove the causes of defects.",
    lesson: "semiconductors",
  },
  {
    id: "fabless",
    term: "Fabless",
    definition: "A chip company that designs chips but has them manufactured by a foundry, as Nvidia, AMD and Apple do.",
    lesson: "semiconductors",
  },
  {
    id: "advanced-packaging",
    term: "Advanced packaging",
    aliases: ["CoWoS", "2.5D packaging"],
    definition: "Joining several dies, such as logic dies and HBM stacks, on a shared base with thousands of fine connections, so they work as one chip. TSMC's CoWoS is the dominant version for AI accelerators.",
    lesson: "semiconductors",
  },
  {
    id: "reticle-limit",
    term: "Reticle limit",
    definition: "The largest area a lithography machine can pattern in one exposure, about 26 × 33 mm. It caps the size of a single die, so bigger chips must combine several dies in one package.",
    lesson: "semiconductors",
  },
  {
    id: "cuda-moat",
    term: "CUDA moat",
    aliases: ["CUDA"],
    definition: "The advantage Nvidia gains from CUDA, its programming platform, and the libraries and code written for it. Switching to another chip means porting and re-tuning software, not just buying hardware.",
    lesson: "semiconductors",
  },

  // D3 hyperscalers
  {
    id: "capex",
    term: "Capex",
    aliases: ["capital expenditure"],
    definition: "Money spent on long-lived assets such as data centers, servers and chips. It is paid in cash up front but charged against profits gradually, through depreciation.",
    lesson: "hyperscalers",
  },
  {
    id: "depreciation",
    term: "Depreciation",
    definition: "The yearly accounting charge that spreads the cost of an asset over its assumed useful life. It changes reported profit, not the cash already spent.",
    lesson: "hyperscalers",
  },
  {
    id: "useful-life",
    term: "Useful life",
    aliases: ["economic life"],
    definition: "The number of years an asset is assumed to be used, which sets its yearly depreciation. For AI accelerators the debate is whether the accounting life matches the years they actually earn money.",
    lesson: "hyperscalers",
  },
  {
    id: "contract-backlog",
    term: "Backlog",
    aliases: ["remaining performance obligations", "RPO"],
    definition: "Revenue customers have contractually committed to but not yet paid. For cloud providers it signals future demand, but it can be concentrated in a few customers.",
    lesson: "hyperscalers",
  },
  {
    id: "circular-financing",
    term: "Circular financing",
    aliases: ["vendor financing"],
    definition: "Deals in which a supplier invests in or lends to a customer that then buys the supplier's products, so the same money appears as investment, contract value and revenue.",
    lesson: "hyperscalers",
  },
  // D4 labs
  {
    id: "frontier-lab",
    term: "Frontier lab",
    definition: "A company training models at or near the leading edge of capability, such as OpenAI, Anthropic, Google DeepMind, Meta or xAI. Its lead over rivals typically lasts months, not years.",
    lesson: "labs",
  },
  {
    id: "open-weights",
    term: "Open weights",
    aliases: ["open-weight model"],
    definition: "A model whose trained parameters are published for anyone to download and run, as with Llama, Qwen or DeepSeek. The training data and code may still be private.",
    lesson: "labs",
  },
  {
    id: "run-rate-revenue",
    term: "Run-rate revenue",
    aliases: ["annualised revenue", "ARR"],
    definition: "The latest month's revenue multiplied by twelve. Fast-growing AI companies quote it because it grows faster than revenue over the past year, but it assumes the current month continues.",
    lesson: "labs",
  },
  {
    id: "commoditize-the-complement",
    term: "Commoditising the complement",
    aliases: ["commoditize the complement"],
    definition: "Making a product that complements your own cheap and abundant, so demand for yours rises and rivals who sell the complement lose margin. A common reason to release open weights.",
    lesson: "labs",
  },

  // D5 unit-economics
  {
    id: "fixed-cost",
    term: "Fixed cost",
    definition: "A cost that does not change with how much is produced, such as training a model. Its share per unit falls as more units, here tokens, are sold.",
    lesson: "unit-economics",
  },
  {
    id: "marginal-cost",
    term: "Marginal cost",
    aliases: ["variable cost"],
    definition: "The cost of producing one more unit. For a served model it is mostly GPU time per token, which falls with batching and utilisation.",
    lesson: "unit-economics",
  },
  {
    id: "gpu-hour",
    term: "GPU-hour",
    definition: "One GPU used for one hour, the usual unit for renting accelerators and for pricing training and serving. Reported on-demand prices for H100-class chips fell from as much as about 8 dollars an hour in 2023 to roughly 2 to 3 dollars by 2025.",
    lesson: "unit-economics",
  },
  {
    id: "jevons-paradox",
    term: "Jevons paradox",
    definition: "When a resource becomes cheaper to use, total consumption of it can rise rather than fall, because new uses become worthwhile. Applied to AI, falling token prices have come with rising total spending.",
    lesson: "unit-economics",
  },

  // D6 buildout
  {
    id: "interconnection-queue",
    term: "Interconnection queue",
    definition: "The waiting list of power plants and large loads, such as data centers, asking to connect to the grid. Studies, upgrades and cost-sharing decisions often keep projects in it for years.",
    lesson: "buildout",
  },
  {
    id: "behind-the-meter",
    term: "Behind-the-meter",
    aliases: ["on-site generation"],
    definition: "Power generated on the customer's own site, such as gas turbines at a data center, rather than drawn from the grid. It can bring first power forward by years.",
    lesson: "buildout",
  },
  {
    id: "power-purchase-agreement",
    term: "Power purchase agreement",
    aliases: ["PPA"],
    definition: "A long-term contract to buy electricity from a specific power plant at an agreed price, often used by tech companies to fund new plants or keep existing ones running.",
    lesson: "buildout",
  },
  {
    id: "small-modular-reactor",
    term: "Small modular reactor",
    aliases: ["SMR"],
    definition: "A smaller nuclear reactor design meant to be built in factories and deployed in units. Tech companies have signed agreements for them, but most are expected in the 2030s.",
    lesson: "buildout",
  },
  {
    id: "capacity-market",
    term: "Capacity market",
    definition: "A market in which grid operators pay power plants to be available in future years. Rising demand, including from data centers, raises its prices, which flow into consumers' bills.",
    lesson: "buildout",
  },

  // D7 export-controls
  {
    id: "export-control",
    term: "Export control",
    aliases: ["export controls"],
    definition: "A government rule that requires a licence to sell certain goods, software or technology to certain countries or companies. Used on advanced chips, chipmaking tools and memory since 2022.",
    lesson: "export-controls",
  },
  {
    id: "entity-list",
    term: "Entity List",
    definition: "A US government list of foreign companies and organisations that may not receive US-origin items without a licence, which is usually denied. Huawei and SMIC are on it.",
    lesson: "export-controls",
  },
  {
    id: "foreign-direct-product-rule",
    term: "Foreign direct product rule",
    aliases: ["FDPR"],
    definition: "A US rule extending export controls to foreign-made items produced with US technology, software or tools. Because most advanced chipmaking relies on them, it gives US controls global reach.",
    lesson: "export-controls",
  },
  {
    id: "ai-diffusion-rule",
    term: "AI diffusion rule",
    definition: "A US rule issued in January 2025 that would have sorted countries into tiers with caps on imports of advanced AI chips. It was rescinded in May 2025 before taking effect.",
    lesson: "export-controls",
  },
  {
    id: "critical-minerals",
    term: "Critical minerals",
    aliases: ["rare earths", "gallium", "germanium"],
    definition: "Raw materials essential to technology with concentrated supply, such as gallium, germanium and rare earths, whose refining China dominates and has placed under export licensing.",
    lesson: "export-controls",
  },

  // D8 sovereign-ai
  {
    id: "sovereign-ai",
    term: "Sovereign AI",
    definition: "A state's effort to ensure no foreign actor can cut it off from the compute, models or chips it depends on, through domestic building, diversified suppliers or mutual dependence.",
    lesson: "sovereign-ai",
  },
  {
    id: "silicon-shield",
    term: "Silicon shield",
    definition: "The argument that the world's dependence on Taiwan's chip fabs deters an attack on Taiwan and motivates others to defend it. Critics say it may also make Taiwan a target.",
    lesson: "sovereign-ai",
  },
  {
    id: "chips-act",
    term: "Chips Act",
    aliases: ["CHIPS and Science Act", "EU Chips Act"],
    definition: "Laws subsidising domestic chip manufacturing and research, notably the US CHIPS and Science Act of 2022 and the EU Chips Act of 2023.",
    lesson: "sovereign-ai",
  },
  {
    id: "data-sovereignty",
    term: "Data sovereignty",
    definition: "Keeping data, and the computing that processes it, under a country's own laws, so that foreign governments cannot compel access through the companies that hold it.",
    lesson: "sovereign-ai",
  },
  {
    id: "ai-gigafactory",
    term: "AI gigafactory",
    definition: "The EU's term for very large public-private AI computing facilities of around 100,000 advanced chips each, funded under its 2025 InvestAI plan.",
    lesson: "sovereign-ai",
  },

  // D9 national-security
  {
    id: "dual-use",
    term: "Dual-use",
    definition: "Technology with both civilian and military applications. Such technologies are typically subject to export controls and security review.",
    lesson: "national-security",
  },
  {
    id: "frontier-safety-framework",
    term: "Frontier-safety framework",
    aliases: ["responsible scaling policy", "preparedness framework"],
    definition: "A lab's published policy naming dangerous-capability thresholds, how models are tested against them, and the safeguards required once a model crosses one.",
    lesson: "national-security",
  },
  {
    id: "dangerous-capability-eval",
    term: "Dangerous-capability evaluation",
    definition: "Tests of whether a model can meaningfully help with harms such as biological weapons or cyberattacks, using expert red-teaming, task benchmarks and uplift studies. They can show a capability is present, not prove it is absent.",
    lesson: "national-security",
  },
  {
    id: "eu-ai-act",
    term: "EU AI Act",
    aliases: ["AI Act"],
    definition: "The European Union's AI law, in force since 2024, which bans some uses, regulates high-risk uses and places duties on general-purpose model providers, with extra duties for models presumed to pose systemic risk, by default those trained with more than 10^25 FLOP.",
    lesson: "national-security",
  },
  {
    id: "compute-governance",
    term: "Compute governance",
    definition: "Using the physical compute supply chain as a policy lever, through thresholds, know-your-customer checks for cloud compute, chip tracking or licensing of the largest training runs.",
    lesson: "national-security",
  },
  {
    id: "compute-threshold",
    term: "Compute threshold",
    definition: "A training-compute level, measured in FLOP, above which a rule applies, such as 10^25 FLOP in the EU AI Act. It is a proxy for capability that weakens as efficiency improves.",
    lesson: "national-security",
  },
];
