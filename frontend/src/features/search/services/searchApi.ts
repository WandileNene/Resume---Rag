import apiClient from '../../../lib/api/client';

export type SearchMode = 'vector' | 'bm25' | 'hybrid';

export type SearchResult = {
  resumeId: string;
  name?: string;
  role?: string;
  company?: string;
  skills?: string[];
  snippet?: string;
  bm25Score?: number;
  vectorScore?: number;
  sources?: Array<'bm25' | 'vector'>;
  relevanceScore?: number;
  reason?: string;
  summary?: string;
  rank?: number;
};

export type SearchResponse = {
  query: string;
  results: SearchResult[];
  model?: string;
  degraded?: boolean;
  warnings?: string[];
  timings?: Record<string, number>;
};

export const searchCandidates = async (
  mode: SearchMode,
  query: string,
  topK: number,
  useLlm = false,
): Promise<SearchResponse> => {
  if (useLlm) {
    const response = await apiClient.post('/v1/search', {
      query,
      options: {
        bm25TopK: Math.max(topK, 10),
        vectorTopK: Math.max(topK, 10),
        rerankTopN: topK,
        finalTopK: topK,
        summarize: true,
        summaryStyle: 'short',
        summaryMaxTokens: 150,
      },
    });
    const data = response.data as SearchResponse;

    return {
      query: data.query ?? query,
      results: data.results ?? [],
      model: data.model,
      degraded: data.degraded,
      warnings: data.warnings,
      timings: data.timings,
    };
  }

  const payload = { query, topK };

  if (mode === 'bm25') {
    const response = await apiClient.post('/v1/search/bm25', payload);
    const data = response.data as SearchResponse;
    return { query: data.query ?? query, results: data.results ?? [], model: data.model, degraded: data.degraded, warnings: data.warnings, timings: data.timings };
  }

  if (mode === 'vector') {
    const response = await apiClient.post('/v1/search/vector', payload);
    const data = response.data as SearchResponse;
    return { query: data.query ?? query, results: data.results ?? [], model: data.model, degraded: data.degraded, warnings: data.warnings, timings: data.timings };
  }

  const response = await apiClient.post('/v1/search/hybrid', payload);
  const data = response.data as { bm25?: SearchResult[]; vector?: SearchResult[]; timings?: Record<string, number> };
  return { query, results: [...(data.bm25 ?? []), ...(data.vector ?? [])], timings: data.timings };
};
