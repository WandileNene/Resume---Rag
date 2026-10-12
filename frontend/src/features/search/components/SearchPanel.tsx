import { useSearchStore } from '../store/searchStore';

export function SearchPanel() {
  const { query, searchType, topK, results, isSearching, error, setQuery, setSearchType, setTopK, search, clear } =
    useSearchStore();

  const modes: Array<{ value: 'vector' | 'bm25' | 'hybrid'; label: string; hint: string }> = [
    { value: 'vector', label: 'Vector', hint: 'Semantic similarity' },
    { value: 'bm25', label: 'BM25', hint: 'Keyword match' },
    { value: 'hybrid', label: 'Hybrid', hint: 'Combined search' },
  ];

  return (
    <section className="search-panel">
      <div className="search-header">
        <div>
          <p className="eyebrow">Resume retrieval</p>
          <h2>Candidate search</h2>
        </div>
        <button type="button" className="secondary-button" onClick={clear}>
          Clear
        </button>
      </div>

      <div className="mode-row">
        {modes.map((mode) => (
          <button
            key={mode.value}
            type="button"
            className={`mode-button ${searchType === mode.value ? 'active' : ''}`}
            onClick={() => setSearchType(mode.value)}
          >
            <strong>{mode.label}</strong>
            <span>{mode.hint}</span>
          </button>
        ))}
      </div>

      <div className="search-input-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by skills, role, experience, keywords..."
          aria-label="Search resumes"
        />

        <select
          value={topK}
          onChange={(event) => setTopK(Number(event.target.value))}
          aria-label="Number of results"
        >
          <option value={3}>3 results</option>
          <option value={5}>5 results</option>
          <option value={10}>10 results</option>
          <option value={20}>20 results</option>
        </select>

        <button type="button" className="primary-button" onClick={() => search()} disabled={isSearching}>
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && <div className="status-box error"><p>{error}</p></div>}

      <div className="results-header">
        <span>{results.length} candidates</span>
      </div>

      <div className="results-list">
        {results.length === 0 && !isSearching && !error && (
          <div className="empty-state">No results yet. Try a recruiter query such as “Python engineer with RAG experience”.</div>
        )}

        {results.map((result, index) => (
          <article key={result.resumeId ?? `${result.name ?? 'candidate'}-${index}`} className="candidate-card">
            <div className="candidate-topline">
              <div>
                <h3>{result.name ?? 'Candidate'}</h3>
                <p>{result.role ?? 'No role available'}</p>
              </div>
              <span className={`score-pill ${searchType}`}>{result.relevanceScore ?? result.vectorScore ?? result.bm25Score ?? 0}</span>
            </div>

            <div className="candidate-meta">
              <span>{result.company ?? 'Company not specified'}</span>
              <span>{result.sources?.join(' + ') ?? searchType}</span>
            </div>

            <div className="skills-row">
              {(result.skills ?? []).slice(0, 6).map((skill) => (
                <span key={`${result.resumeId}-${skill}`} className="skill-pill">
                  {skill}
                </span>
              ))}
            </div>

            {result.reason && <p className="reason-text">{result.reason}</p>}
            {result.summary && <p className="summary-text">{result.summary}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
