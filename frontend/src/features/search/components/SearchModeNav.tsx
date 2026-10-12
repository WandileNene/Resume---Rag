import type { SearchMode } from '../services/searchApi';

interface SearchModeNavProps {
  activeMode: SearchMode;
  onChange: (mode: SearchMode) => void;
}

const modes: Array<{ value: SearchMode; label: string; description: string }> = [
  { value: 'vector', label: 'Vector Search', description: 'Semantic similarity' },
  { value: 'bm25', label: 'BM25 Keyword', description: 'Exact term matching' },
  { value: 'hybrid', label: 'Hybrid', description: 'Combined retrieval' },
];

export function SearchModeNav({ activeMode, onChange }: SearchModeNavProps) {
  return (
    <div className="sidebar-mode-list" aria-label="Search mode">
      {modes.map((mode) => (
        <button
          key={mode.value}
          type="button"
          className={`sidebar-mode-button ${activeMode === mode.value ? 'active' : ''}`}
          onClick={() => onChange(mode.value)}
          aria-pressed={activeMode === mode.value}
        >
          <span>
            <strong>{mode.label}</strong>
            <small>{mode.description}</small>
          </span>
          {activeMode === mode.value && <b aria-hidden="true">✓</b>}
        </button>
      ))}
    </div>
  );
}