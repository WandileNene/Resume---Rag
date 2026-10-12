import type { SearchMode, SearchResult } from '../services/searchApi';
import { RankBadge } from './RankBadge';
import { ScorePill } from './ScorePill';

interface ResultCardProps {
  result: SearchResult;
  rank: number;
  mode: SearchMode;
  onSelect?: (candidateId: string) => void;
}

export function ResultCard({ result, rank, mode, onSelect }: ResultCardProps) {
  const snippet = result.snippet ?? result.summary ?? result.reason ?? 'No candidate summary available.';

  return (
    <article
      className={`result-card ${onSelect ? 'result-card-clickable' : ''}`}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={() => onSelect?.(result.resumeId)}
      onKeyDown={(event) => {
        if (onSelect && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onSelect(result.resumeId);
        }
      }}
    >
      <div className="result-card-topline">
        <RankBadge rank={rank} />
        <div className="result-card-title">
          <strong>{result.name ?? 'Candidate'}</strong>
          <span>{result.role ?? 'Role not specified'}</span>
        </div>
        <ScorePill result={result} mode={mode} />
      </div>
      <div className="result-card-meta">
        <span>{result.company ?? 'Company not specified'}</span>
        <span>{result.sources?.join(' + ') ?? mode}</span>
      </div>
      {result.skills && result.skills.length > 0 && (
        <div className="result-card-skills">
          {result.skills.slice(0, 5).map((skill) => <span key={skill}>{skill}</span>)}
        </div>
      )}
      <p>{snippet.length > 200 ? `${snippet.slice(0, 200)}...` : snippet}</p>
      {result.reason && <p className="reason-text"><strong>Why this candidate</strong>{result.reason}</p>}
      {result.summary && <p className="summary-text"><strong>Recruiter summary</strong>{result.summary}</p>}
      {onSelect && (
        <button
          type="button"
          className="view-resume-button"
          onClick={(event) => {
            event.stopPropagation();
            onSelect(result.resumeId);
          }}
          aria-label={`View full resume for ${result.name ?? 'candidate'}`}
        >
          View full resume
        </button>
      )}
    </article>
  );
}