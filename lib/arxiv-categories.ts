/**
 * arXiv Category Definitions
 * 
 * Common subcategories for Computer Science and Physics
 * Based on arXiv taxonomy: https://arxiv.org/category_taxonomy
 */

export interface ArxivCategory {
  code: string;
  name: string;
  description: string;
  parent: "cs" | "physics";
}

export const ARXIV_CATEGORIES: ArxivCategory[] = [
  // Computer Science categories
  { code: "cs.AI", name: "Artificial Intelligence", description: "AI and machine learning", parent: "cs" },
  { code: "cs.LG", name: "Machine Learning", description: "Machine learning algorithms and theory", parent: "cs" },
  { code: "cs.CV", name: "Computer Vision", description: "Computer vision and pattern recognition", parent: "cs" },
  { code: "cs.CL", name: "Computation and Language", description: "NLP and computational linguistics", parent: "cs" },
  { code: "cs.NE", name: "Neural and Evolutionary Computing", description: "Neural networks, genetic algorithms", parent: "cs" },
  { code: "cs.RO", name: "Robotics", description: "Robotics and automation", parent: "cs" },
  { code: "cs.SY", name: "Systems and Control", description: "Control systems and automation", parent: "cs" },
  { code: "cs.SE", name: "Software Engineering", description: "Software development and engineering", parent: "cs" },
  { code: "cs.PL", name: "Programming Languages", description: "Programming language theory", parent: "cs" },
  { code: "cs.DS", name: "Data Structures and Algorithms", description: "Algorithms and data structures", parent: "cs" },
  { code: "cs.DB", name: "Databases", description: "Database systems and theory", parent: "cs" },
  { code: "cs.CR", name: "Cryptography and Security", description: "Security and cryptography", parent: "cs" },
  { code: "cs.DC", name: "Distributed, Parallel, and Cluster Computing", description: "Distributed systems", parent: "cs" },
  { code: "cs.OS", name: "Operating Systems", description: "Operating systems and systems software", parent: "cs" },
  { code: "cs.AR", name: "Hardware Architecture", description: "Computer hardware architecture", parent: "cs" },
  { code: "cs.CC", name: "Computational Complexity", description: "Computational complexity theory", parent: "cs" },
  { code: "cs.GT", name: "Computer Science and Game Theory", description: "Game theory in CS", parent: "cs" },
  { code: "cs.LO", name: "Logic in Computer Science", description: "Logic and formal methods", parent: "cs" },
  { code: "cs.IT", name: "Information Theory", description: "Information theory and coding", parent: "cs" },
  { code: "cs.MA", name: "Multiagent Systems", description: "Multi-agent systems", parent: "cs" },
  { code: "cs.MM", name: "Multimedia", description: "Multimedia computing", parent: "cs" },
  { code: "cs.NI", name: "Networking and Internet Architecture", description: "Computer networks", parent: "cs" },
  { code: "cs.SI", name: "Social and Information Networks", description: "Social networks, web science", parent: "cs" },
  
  // Physics categories
  { code: "physics.optics", name: "Optics", description: "Optics and photonics", parent: "physics" },
  { code: "physics.quant-ph", name: "Quantum Physics", description: "Quantum mechanics and quantum information", parent: "physics" },
  { code: "physics.atom-ph", name: "Atomic Physics", description: "Atomic and molecular physics", parent: "physics" },
  { code: "physics.class-ph", name: "Classical Physics", description: "Classical mechanics and electromagnetism", parent: "physics" },
  { code: "physics.chem-ph", name: "Chemical Physics", description: "Chemical physics and physical chemistry", parent: "physics" },
  { code: "physics.comp-ph", name: "Computational Physics", description: "Computational methods in physics", parent: "physics" },
  { code: "physics.data-an", name: "Data Analysis, Statistics and Probability", description: "Data analysis in physics", parent: "physics" },
  { code: "physics.flu-dyn", name: "Fluid Dynamics", description: "Fluid mechanics and dynamics", parent: "physics" },
  { code: "physics.gen-ph", name: "General Physics", description: "General physics", parent: "physics" },
  { code: "physics.geo-ph", name: "Geophysics", description: "Geophysics and earth sciences", parent: "physics" },
  { code: "physics.hist-ph", name: "History and Philosophy of Physics", description: "History of physics", parent: "physics" },
  { code: "physics.ins-det", name: "Instrumentation and Detectors", description: "Experimental instrumentation", parent: "physics" },
  { code: "physics.med-ph", name: "Medical Physics", description: "Medical physics and biophysics", parent: "physics" },
  { code: "physics.plasm-ph", name: "Plasma Physics", description: "Plasma physics", parent: "physics" },
  { code: "physics.pop-ph", name: "Popular Physics", description: "Popular physics and outreach", parent: "physics" },
  { code: "physics.soc-ph", name: "Physics and Society", description: "Physics education and society", parent: "physics" },
  { code: "physics.space-ph", name: "Space Physics", description: "Space physics and astrophysics", parent: "physics" },
];

/**
 * Get categories grouped by parent (cs or physics)
 */
export function getCategoriesByParent(parent: "cs" | "physics"): ArxivCategory[] {
  return ARXIV_CATEGORIES.filter((cat) => cat.parent === parent);
}

/**
 * Build arXiv API category filter query from selected category codes
 * Format: (cat:cs.AI OR cat:cs.LG OR cat:physics.optics)
 */
export function buildCategoryFilter(categoryCodes: string[]): string {
  if (categoryCodes.length === 0) {
    return "cat:*"; // All categories
  }
  return categoryCodes.map((code) => `cat:${code}`).join(" OR ");
}

