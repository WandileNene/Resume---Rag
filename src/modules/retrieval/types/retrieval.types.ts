export interface RetrievalCandidate {
  resumeId: string;
  name?: string;
  role?: string;
  company?: string;
  skills: string[];
  score?: number;
}

export interface CandidateSnippet extends RetrievalCandidate {
  rawText: string;
  experienceSummary?: string;
}

export interface RetrievalFilters {
  minYearsExperience?: number;
}

export interface SearchCandidate {
  resumeId: string;
  name?: string;
  role?: string;
  company?: string;
  skills?: string[];
  snippet?: string;
  bm25Score?: number;
  vectorScore?: number;
  sources: ("bm25" | "vector")[];
}

/**
 * A candidate that has been merged from BM25 and/or vector results.
 * This is the input shape passed to the LLM re-ranker.
 * - sources lists every retrieval path that returned this candidate
 * - bm25Score / vectorScore are retained separately — never combined
 * - snippet is a size-controlled string built by candidateMapper for LLM consumption
 */
export interface MergedCandidate {
  resumeId: string;
  name?: string;
  role?: string;
  company?: string;
  skills: string[];
  bm25Score?: number;
  vectorScore?: number;
  sources: ("bm25" | "vector")[];
  snippet: string;
}