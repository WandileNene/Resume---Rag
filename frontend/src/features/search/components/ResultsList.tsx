import type { SearchMode, SearchResult } from '../services/searchApi';
import { EmptyState } from './EmptyState';
import { ResultCard } from './ResultCard';
import { ResultSummary } from './ResultSummary';

interface ResultsListProps {
  results: SearchResult[];
  mode: SearchMode;
  duration: number;
  onSelect?: (candidateId: string) => void;
}

export function ResultsList({ results, mode, duration, onSelect }: ResultsListProps) {
  return (
    <div className="results-module">
      <ResultSummary count={results.length} mode={mode} duration={duration} />
      {results.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="result-card-list">
          {results.map((result, index) => (
            <ResultCard
              key={result.resumeId ?? `${result.name ?? 'candidate'}-${index}`}
              result={result}
              rank={result.rank ?? index + 1}
              mode={mode}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}