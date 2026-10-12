import type { SearchMode } from '../services/searchApi';

interface ResultSummaryProps {
  count: number;
  mode: SearchMode;
  duration: number;
}

export function ResultSummary({ count, mode, duration }: ResultSummaryProps) {
  return (
    <div className="result-summary">
      <strong>Found {count} candidate{count === 1 ? '' : 's'}</strong>
      <span className={`mode-badge ${mode}`}>{mode}</span>
      {duration > 0 && <span>{duration} ms</span>}
    </div>
  );
}