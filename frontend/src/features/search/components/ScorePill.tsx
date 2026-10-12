import type { SearchMode, SearchResult } from '../services/searchApi';

interface ScorePillProps {
  result: SearchResult;
  mode: SearchMode;
}

export function ScorePill({ result, mode }: ScorePillProps) {
  const rawScore = result.relevanceScore ?? result.vectorScore ?? result.bm25Score ?? 0;
  const score = Number(rawScore);
  const label = mode === 'vector' ? 'Similarity' : mode === 'bm25' ? 'BM25' : 'Hybrid';

  return <span className={`score-pill ${mode}`}>{label} {Number.isFinite(score) ? score.toFixed(2) : 'N/A'}</span>;
}